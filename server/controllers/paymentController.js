const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { generateInvoicePDF } = require('../utils/invoiceGenerator');

// @desc    Create Razorpay Test Order
// @route   POST /api/payments/create-order
// @access  Private/Customer
const createRazorpayOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this booking payment.' });
    }

    const amountInPaise = Math.round(booking.pricing.totalAmount * 100);

    // If Razorpay test credentials exist, we generate or mock order
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_GharKaamKey123';
    const mockOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    res.status(200).json({
      success: true,
      data: {
        orderId: mockOrderId,
        amount: amountInPaise,
        currency: 'INR',
        keyId,
        bookingNumber: booking.bookingNumber,
        customerName: req.user.fullName,
        customerEmail: req.user.email,
        customerPhone: req.user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/payments/verify
// @access  Private/Customer
const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const booking = await Booking.findById(bookingId).populate('customer helper services.service');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // In test mode: allow test verification or HMAC verification if secret is configured
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    let isValid = true;

    if (keySecret && !keySecret.includes('SecretKey456') && razorpaySignature) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');
      isValid = generatedSignature === razorpaySignature;
    }

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Razorpay signature verification failed.' });
    }

    const randomInv = Math.floor(100000 + Math.random() * 900000);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${randomInv}`;

    const payment = await Payment.create({
      booking: booking._id,
      customer: booking.customer._id,
      helper: booking.helper._id,
      amount: booking.pricing.totalAmount,
      currency: 'INR',
      method: 'razorpay',
      status: 'completed',
      razorpayOrderId: razorpayOrderId || '',
      razorpayPaymentId: razorpayPaymentId || `pay_test_${Date.now()}`,
      razorpaySignature: razorpaySignature || 'verified_test_sig',
      invoiceNumber,
      paidAt: new Date(),
    });

    // Generate PDF invoice
    try {
      const { relativePath } = await generateInvoicePDF(booking, payment);
      payment.invoicePath = relativePath;
      await payment.save();
    } catch (pdfErr) {
      console.error('Invoice PDF Generation error:', pdfErr.message);
    }

    booking.payment = payment._id;
    await booking.save();

    // Notify Customer & Helper
    await Notification.create({
      user: booking.customer._id,
      title: 'Payment Successful 💳',
      message: `Payment of ₹${booking.pricing.totalAmount} for #${booking.bookingNumber} is verified. Invoice #${invoiceNumber} is ready.`,
      type: 'payment',
      link: `/booking-detail.html?id=${booking._id}`,
    });

    await Notification.create({
      user: booking.helper._id,
      title: 'Customer Payment Received 💰',
      message: `Customer paid ₹${booking.pricing.totalAmount} online for booking #${booking.bookingNumber}.`,
      type: 'payment',
      link: `/booking-detail.html?id=${booking._id}`,
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      data: {
        payment,
        invoiceNumber,
        invoiceUrl: payment.invoicePath,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Select Pay After Service (Cash on Delivery)
// @route   POST /api/payments/pay-after-service
// @access  Private/Customer
const payAfterService = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId).populate('customer helper services.service');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const randomInv = Math.floor(100000 + Math.random() * 900000);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${randomInv}`;

    const payment = await Payment.create({
      booking: booking._id,
      customer: booking.customer._id,
      helper: booking.helper._id,
      amount: booking.pricing.totalAmount,
      currency: 'INR',
      method: 'cash',
      status: 'pending', // Pending cash collection on service completion
      invoiceNumber,
    });

    // Generate PDF invoice bill
    try {
      const { relativePath } = await generateInvoicePDF(booking, payment);
      payment.invoicePath = relativePath;
      await payment.save();
    } catch (pdfErr) {
      console.error('Invoice generation error:', pdfErr.message);
    }

    booking.payment = payment._id;
    await booking.save();

    await Notification.create({
      user: booking.customer._id,
      title: 'Pay After Service Selected 💵',
      message: `Your booking #${booking.bookingNumber} is set to Pay after service. You will pay ₹${booking.pricing.totalAmount} directly upon service completion.`,
      type: 'payment',
      link: `/booking-detail.html?id=${booking._id}`,
    });

    await Notification.create({
      user: booking.helper._id,
      title: 'Cash Payment Scheduled 💵',
      message: `Customer will pay ₹${booking.pricing.totalAmount} in cash upon completion of booking #${booking.bookingNumber}.`,
      type: 'payment',
      link: `/booking-detail.html?id=${booking._id}`,
    });

    res.status(200).json({
      success: true,
      message: 'Pay after service confirmed.',
      data: {
        payment,
        invoiceNumber,
        invoiceUrl: payment.invoicePath,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download / Stream invoice PDF
// @route   GET /api/payments/invoice/:id
// @access  Private
const downloadInvoice = async (req, res, next) => {
  try {
    let payment = await Payment.findById(req.params.id);
    if (!payment) {
      payment = await Payment.findOne({ booking: req.params.id });
    }
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    // Check authorization
    const isAllowed =
      req.user.role === 'admin' ||
      payment.customer.toString() === req.user._id.toString() ||
      payment.helper.toString() === req.user._id.toString();

    if (!isAllowed) {
      return res.status(403).json({ success: false, message: 'Not authorized to download this invoice.' });
    }

    const invoicesDir = path.join(__dirname, '..', '..', 'public', 'assets', 'uploads', 'invoices');
    const fileName = `Invoice-${payment.invoiceNumber}.pdf`;
    const filePath = path.join(invoicesDir, fileName);

    if (!fs.existsSync(filePath)) {
      // Re-generate if missing
      const booking = await Booking.findById(payment.booking).populate('customer helper services.service');
      if (booking) {
        await generateInvoicePDF(booking, payment);
      }
    }

    if (fs.existsSync(filePath)) {
      return res.download(filePath, fileName);
    } else {
      return res.status(404).json({ success: false, message: 'Invoice file not found on disk.' });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  payAfterService,
  downloadInvoice,
};
