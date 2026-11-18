const Booking = require('../models/Booking');
const User = require('../models/User');
const HelperProfile = require('../models/HelperProfile');
const Service = require('../models/Service');
const Coupon = require('../models/Coupon');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const { calculateBookingPricing } = require('../utils/pricing');
const {
  sendNewBookingToHelperEmail,
  sendBookingPlacedToCustomerEmail,
  sendBookingAcceptedEmail,
  sendBookingDeclinedEmail,
  sendBookingCompletedEmail,
} = require('../utils/email');

// @desc    Create a new Booking
// @route   POST /api/bookings
// @access  Private/Customer
const createBooking = async (req, res, next) => {
  try {
    const {
      helperId,
      workFrom,
      workTo,
      preferredTime,
      cookingDetails,
      address,
      notes,
      instructions,
      couponCode,
      useWallet,
      isEmergency,
      isRecurring,
      recurringType,
      paymentMethod,
    } = req.body;

    const serviceIds = req.body.serviceIds || req.body.services;

    if (!helperId || !serviceIds || !serviceIds.length || !workFrom || !workTo) {
      return res.status(400).json({
        success: false,
        message: 'Please provide helper, at least one service, and booking dates.',
      });
    }

    const fromDate = new Date(workFrom);
    const toDate = new Date(workTo);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date selection. Start date must be before or equal to end date.',
      });
    }

    // Verify helper
    const helperUser = await User.findById(helperId);
    if (!helperUser || helperUser.role !== 'helper') {
      return res.status(404).json({ success: false, message: 'Selected helper does not exist.' });
    }

    const helperProfile = await HelperProfile.findOne({ user: helperId });
    if (!helperProfile) {
      return res.status(404).json({ success: false, message: 'Helper profile not found.' });
    }

    if (helperProfile.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'This helper is not currently approved for bookings.' });
    }

    if (!helperProfile.isAvailable) {
      return res.status(400).json({ success: false, message: 'This helper is currently marked as unavailable.' });
    }

    // Check double-booking / date overlaps
    const conflictingBooking = await Booking.findOne({
      helper: helperId,
      status: { $in: ['accepted', 'in-progress'] },
      $or: [
        { workFrom: { $lte: toDate }, workTo: { $gte: fromDate } },
      ],
    });

    if (conflictingBooking) {
      return res.status(400).json({
        success: false,
        message: 'This helper is already booked for these selected dates. Please choose another date or helper.',
      });
    }

    // Determine rates for chosen services from helper profile or default service baseRate
    const selectedServiceRates = [];
    let hasCooking = false;

    for (const sid of serviceIds) {
      const serv = await Service.findById(sid);
      if (!serv) continue;

      if (serv.slug === 'cooking') {
        hasCooking = true;
      }

      // Check if helper has customized rate for this service
      const helperRateObj = helperProfile.services.find(
        (hs) => hs.service && hs.service.toString() === sid.toString()
      );
      const rate = helperRateObj ? helperRateObj.rate : serv.baseRate;
      selectedServiceRates.push({
        service: serv._id,
        rate,
      });
    }

    if (!selectedServiceRates.length) {
      return res.status(400).json({ success: false, message: 'No valid services selected.' });
    }

    // Handle coupon
    let couponDiscount = 0;
    let validCoupon = null;
    if (couponCode) {
      validCoupon = await Coupon.findOne({
        code: couponCode.trim().toUpperCase(),
        active: true,
        validFrom: { $lte: new Date() },
        validTo: { $gte: new Date() },
      });

      if (validCoupon && validCoupon.usedCount < validCoupon.usageLimit) {
        // We will calculate discount after subtotal
      } else {
        return res.status(400).json({ success: false, message: 'Coupon code is invalid or expired.' });
      }
    }

    // Fetch customer's wallet balance
    const customer = await User.findById(req.user._id);

    // Initial pricing preview to calculate coupon discount
    const preliminaryPricing = calculateBookingPricing({
      serviceRates: selectedServiceRates,
      workFrom: fromDate,
      workTo: toDate,
      isEmergency: !!isEmergency,
      couponDiscount: 0,
      walletAvailable: customer.walletBalance,
      useWallet: false,
    });

    if (validCoupon) {
      if (preliminaryPricing.subtotal >= validCoupon.minBookingAmount) {
        if (validCoupon.discountType === 'percentage') {
          couponDiscount = Math.min(
            validCoupon.maxDiscount,
            (preliminaryPricing.subtotal * validCoupon.discountValue) / 100
          );
        } else {
          couponDiscount = Math.min(preliminaryPricing.subtotal, validCoupon.discountValue);
        }
        validCoupon.usedCount += 1;
        await validCoupon.save();
      } else {
        return res.status(400).json({
          success: false,
          message: `Minimum booking amount of ₹${validCoupon.minBookingAmount} required for coupon ${validCoupon.code}.`,
        });
      }
    }

    // Final accurate server-side pricing
    const finalPricing = calculateBookingPricing({
      serviceRates: selectedServiceRates,
      workFrom: fromDate,
      workTo: toDate,
      isEmergency: !!isEmergency,
      couponDiscount,
      walletAvailable: customer.walletBalance,
      useWallet: !!useWallet,
    });

    // Deduct wallet if used
    if (finalPricing.walletUsed > 0) {
      customer.walletBalance = Math.max(0, customer.walletBalance - finalPricing.walletUsed);
      await customer.save();
    }

    // Generate unique booking number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `GK-${new Date().getFullYear()}-${randomSuffix}`;

    // Auto-expire in 24 hours if not responded
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const booking = await Booking.create({
      bookingNumber,
      customer: customer._id,
      helper: helperId,
      services: selectedServiceRates,
      workFrom: fromDate,
      workTo: toDate,
      totalDays: finalPricing.daysCount,
      preferredTime: preferredTime || 'Morning (8:00 AM - 12:00 PM)',
      cookingDetails: {
        isCooking: hasCooking,
        preference: hasCooking ? cookingDetails?.preference || 'both' : 'none',
        peopleCount: hasCooking ? Number(cookingDetails?.peopleCount || 2) : 2,
      },
      address: {
        addressLine: address?.addressLine || customer.address?.addressLine || 'Home Address',
        landmark: address?.landmark || customer.address?.landmark || '',
        district: address?.district || customer.address?.district || 'Central',
        state: address?.state || customer.address?.state || 'Local',
        pincode: address?.pincode || customer.address?.pincode || '110001',
      },
      notes: notes || '',
      pricing: finalPricing,
      isEmergency: !!isEmergency,
      isRecurring: !!isRecurring,
      recurringType: recurringType || 'none',
      status: 'pending',
      expiresAt,
    });

    // Notify Helper
    await Notification.create({
      user: helperId,
      title: 'New Booking Request! 🔔',
      message: `${customer.fullName} sent you a new booking request (#${bookingNumber}) for ${finalPricing.daysCount} day(s).`,
      type: 'booking',
      link: `/booking-detail.html?id=${booking._id}`,
    });

    // Notify Customer
    await Notification.create({
      user: customer._id,
      title: 'Booking Placed Successfully 📋',
      message: `Your booking request #${bookingNumber} is pending confirmation from ${helperUser.fullName}.`,
      type: 'booking',
      link: `/booking-detail.html?id=${booking._id}`,
    });

    // Populate services for rich email notifications
    Booking.findById(booking._id)
      .populate('services.service', 'name icon')
      .then((popBooking) => {
        const emailBooking = popBooking || booking;
        // 1. Email to helper with booking details
        sendNewBookingToHelperEmail(helperUser, customer, emailBooking).catch((err) =>
          console.error('[Email Notification Error] Helper new booking email:', err.message)
        );
        // 2. Email confirmation to customer
        sendBookingPlacedToCustomerEmail(customer, helperUser, emailBooking).catch((err) =>
          console.error('[Email Notification Error] Customer booking placed email:', err.message)
        );
      })
      .catch((err) => console.error('[Booking Populate Error]:', err.message));

    res.status(201).json({
      success: true,
      message: 'Booking placed successfully.',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bookings for logged-in Customer
// @route   GET /api/bookings/customer
// @access  Private/Customer
const getCustomerBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = { customer: req.user._id };

    if (status && status !== 'all') {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('helper', 'fullName phone avatar address')
      .populate('services.service', 'name icon baseRate')
      .populate('payment')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bookings for logged-in Helper
// @route   GET /api/bookings/helper
// @access  Private/Helper
const getHelperBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = { helper: req.user._id };

    if (status && status !== 'all') {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('customer', 'fullName phone avatar address')
      .populate('services.service', 'name icon')
      .populate('payment')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'fullName phone email avatar address')
      .populate('helper', 'fullName phone email avatar address')
      .populate('services.service', 'name icon baseRate description')
      .populate('payment');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Authorization check: Customer, Helper or Admin
    const isOwner =
      req.user.role === 'admin' ||
      booking.customer._id.toString() === req.user._id.toString() ||
      booking.helper._id.toString() === req.user._id.toString();

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this booking.' });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Helper responds to booking (accept / decline)
// @route   PUT /api/bookings/:id/respond
// @access  Private/Helper
const respondToBooking = async (req, res, next) => {
  try {
    const { action, comment } = req.body; // 'accept' or 'decline'
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.helper.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this booking action.' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Booking is already ${booking.status} and cannot be modified.`,
      });
    }

    const customerUser = await User.findById(booking.customer);
    const helperUser = await User.findById(booking.helper);
    const populatedBooking = await Booking.findById(booking._id).populate('services.service', 'name icon');

    if (action === 'accept') {
      booking.status = 'accepted';
      booking.helperResponseComment = comment || 'Booking accepted. Looking forward to assisting you!';
      await booking.save();

      // Notify Customer via In-App Notification
      await Notification.create({
        user: booking.customer,
        title: 'Booking Accepted! 🎉',
        message: `Your booking #${booking.bookingNumber} was accepted! You can now chat with your helper or complete payment.`,
        type: 'booking',
        link: `/booking-detail.html?id=${booking._id}`,
      });

      // Send Email to Customer: Helper Confirmed
      if (customerUser && helperUser) {
        sendBookingAcceptedEmail(customerUser, helperUser, populatedBooking || booking).catch((err) =>
          console.error('[Email Notification Error] Booking accepted email:', err.message)
        );
      }
    } else if (action === 'decline') {
      booking.status = 'declined';
      booking.helperResponseComment = comment || 'Helper is unavailable for the requested schedule.';
      await booking.save();

      // If customer used wallet credits, refund them back to customer wallet
      if (booking.pricing && booking.pricing.walletUsed > 0) {
        if (customerUser) {
          customerUser.walletBalance += booking.pricing.walletUsed;
          await customerUser.save();
        }
      }

      // Notify Customer via In-App Notification
      await Notification.create({
        user: booking.customer,
        title: 'Booking Request Declined ⚠️',
        message: `Helper was unable to accept booking #${booking.bookingNumber}. Any applied wallet credits have been refunded.`,
        type: 'booking',
        link: `/booking-detail.html?id=${booking._id}`,
      });

      // Send Email to Customer: Helper Declined
      if (customerUser && helperUser) {
        sendBookingDeclinedEmail(customerUser, helperUser, populatedBooking || booking, comment).catch((err) =>
          console.error('[Email Notification Error] Booking declined email:', err.message)
        );
      }
    } else {
      return res.status(400).json({ success: false, message: "Action must be 'accept' or 'decline'." });
    }

    res.status(200).json({
      success: true,
      message: `Booking ${action}ed successfully.`,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking progress (in-progress, completed)
// @route   PUT /api/bookings/:id/status
// @access  Private/Helper or Admin
const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const isHelper = booking.helper.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isHelper && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    if (!['in-progress', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status transition.' });
    }

    booking.status = status;
    await booking.save();

    if (status === 'completed') {
      // Increment totalCompletedJobs on helper profile
      const helperProf = await HelperProfile.findOne({ user: booking.helper });
      if (helperProf) {
        helperProf.totalCompletedJobs += 1;
        await helperProf.save();
      }

      // Notify Customer to review
      await Notification.create({
        user: booking.customer,
        title: 'Service Completed! ⭐',
        message: `Your booking #${booking.bookingNumber} is marked completed. How was your experience? Leave a review!`,
        type: 'booking',
        link: `/booking-detail.html?id=${booking._id}`,
      });

      // Send Review Invitation Email to Customer
      const customerUser = await User.findById(booking.customer);
      const helperUser = await User.findById(booking.helper);
      if (customerUser && helperUser) {
        sendBookingCompletedEmail(customerUser, helperUser, booking).catch((err) =>
          console.error('[Email Notification Error] Booking completed review invite email:', err.message)
        );
      }
    }

    res.status(200).json({
      success: true,
      message: `Booking marked as ${status}.`,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel booking (Customer)
// @route   PUT /api/bookings/:id/cancel
// @access  Private/Customer
const cancelBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking.' });
    }

    if (!['pending', 'accepted'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a booking that is ${booking.status}.`,
      });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason || 'Cancelled by customer';
    booking.cancelledBy = req.user._id;
    await booking.save();

    // Refund wallet if used
    if (booking.pricing && booking.pricing.walletUsed > 0) {
      const customerUser = await User.findById(booking.customer);
      if (customerUser) {
        customerUser.walletBalance += booking.pricing.walletUsed;
        await customerUser.save();
      }
    }

    // Notify Helper
    await Notification.create({
      user: booking.helper,
      title: 'Booking Cancelled ℹ️',
      message: `Booking #${booking.bookingNumber} was cancelled by the customer.`,
      type: 'booking',
    });

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully.',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate / apply coupon preview
// @route   POST /api/bookings/validate-coupon
// @access  Private
const validateCoupon = async (req, res, next) => {
  try {
    const { code, amount } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required.' });
    }

    const coupon = await Coupon.findOne({
      code: code.trim().toUpperCase(),
      active: true,
      validFrom: { $lte: new Date() },
      validTo: { $gte: new Date() },
    });

    if (!coupon || coupon.usedCount >= coupon.usageLimit) {
      return res.status(404).json({ success: false, message: 'Invalid, expired, or exhausted coupon code.' });
    }

    const bookingAmount = Number(amount || 0);
    if (bookingAmount < coupon.minBookingAmount) {
      return res.status(400).json({
        success: false,
        message: `This coupon requires a minimum booking amount of ₹${coupon.minBookingAmount}.`,
      });
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = Math.min(coupon.maxDiscount, (bookingAmount * coupon.discountValue) / 100);
    } else {
      discount = Math.min(bookingAmount, coupon.discountValue);
    }

    res.status(200).json({
      success: true,
      message: `Coupon applied! You save ₹${Math.round(discount)}.`,
      data: {
        code: coupon.code,
        discount: Math.round(discount),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getCustomerBookings,
  getHelperBookings,
  getBookingById,
  respondToBooking,
  updateBookingStatus,
  cancelBooking,
  validateCoupon,
};
