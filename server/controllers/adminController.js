const User = require('../models/User');
const HelperProfile = require('../models/HelperProfile');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Service = require('../models/Service');
const ContactMessage = require('../models/ContactMessage');
const Feedback = require('../models/Feedback');
const Complaint = require('../models/Complaint');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');
const Notification = require('../models/Notification');

// @desc    Get Admin Dashboard Stats & Chart Data
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalHelpers = await User.countDocuments({ role: 'helper' });
    const pendingHelpers = await HelperProfile.countDocuments({ status: 'pending' });
    const approvedHelpers = await HelperProfile.countDocuments({ status: 'approved' });

    const totalBookings = await Booking.countDocuments();
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const activeBookings = await Booking.countDocuments({ status: { $in: ['accepted', 'in-progress'] } });

    const completedPayments = await Payment.find({ status: 'completed' });
    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);

    const unreadMessages = await ContactMessage.countDocuments({ status: 'unread' });
    const openComplaints = await Complaint.countDocuments({ status: 'open' });

    // Status breakdown for Chart.js
    const statuses = ['pending', 'accepted', 'in-progress', 'completed', 'declined', 'cancelled'];
    const bookingStatusCounts = {};
    for (const st of statuses) {
      bookingStatusCounts[st] = await Booking.countDocuments({ status: st });
    }

    // Monthly bookings (last 6 months)
    const monthlyBookings = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const recentBookings = await Booking.find({ createdAt: { $gte: sixMonthsAgo } });
    recentBookings.forEach((b) => {
      const date = new Date(b.createdAt);
      const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      monthlyBookings[key] = (monthlyBookings[key] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalCustomers,
        totalHelpers,
        pendingHelpers,
        approvedHelpers,
        totalBookings,
        completedBookings,
        activeBookings,
        totalRevenue,
        unreadMessages,
        openComplaints,
        bookingStatusCounts,
        monthlyBookings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Public Live Platform Stats for Homepage
// @route   GET /api/admin/public-stats
// @access  Public
const getPublicLiveStats = async (req, res, next) => {
  try {
    const verifiedHelpers = await HelperProfile.countDocuments({ status: 'approved' });
    const completedJobs = await Booking.countDocuments({ status: 'completed' });

    // Distinct districts from users
    const districts = await User.distinct('address.district', { 'address.district': { $ne: '' } });
    const citiesCount = Math.max(12, districts.length);

    // Platform average rating
    const approvedReviews = await Review.find({ status: 'approved' });
    let avgRating = 4.9;
    if (approvedReviews.length) {
      const sum = approvedReviews.reduce((acc, r) => acc + r.rating, 0);
      avgRating = Number((sum / approvedReviews.length).toFixed(1));
    }

    res.status(200).json({
      success: true,
      data: {
        verifiedHelpers: Math.max(50, verifiedHelpers),
        completedJobs: Math.max(250, completedJobs),
        citiesCount,
        avgRating,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Users (Admin)
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 15 } = req.query;
    let query = {};

    if (role && role !== 'all') query.role = role;
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status (suspend / activate / delete)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'admin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot modify another administrator.' });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User status changed to ${status}.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Helper Approval Queue
// @route   GET /api/admin/helpers/pending
// @access  Private/Admin
const getHelperApprovalQueue = async (req, res, next) => {
  try {
    const pendingHelpers = await HelperProfile.find({ status: 'pending' })
      .populate('user', 'fullName username email phone address avatar createdAt')
      .populate('services.service', 'name icon baseRate')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingHelpers.length,
      data: pendingHelpers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve Helper
// @route   PUT /api/admin/helpers/:id/approve
// @access  Private/Admin
const approveHelper = async (req, res, next) => {
  try {
    const helperProfile = await HelperProfile.findById(req.params.id);
    if (!helperProfile) {
      return res.status(404).json({ success: false, message: 'Helper profile not found.' });
    }

    helperProfile.status = 'approved';
    helperProfile.verified = true;
    helperProfile.rejectionReason = '';
    await helperProfile.save();

    // Also update User status
    await User.findByIdAndUpdate(helperProfile.user, { status: 'active' });

    // Notify Helper
    await Notification.create({
      user: helperProfile.user,
      title: 'Congratulations! Profile Approved 🎉',
      message: 'Your GharKaam helper verification is complete. You can now accept booking requests and grow your domestic earnings!',
      type: 'account',
      link: '/helper-dashboard.html',
    });

    res.status(200).json({
      success: true,
      message: 'Helper approved successfully.',
      data: helperProfile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject Helper
// @route   PUT /api/admin/helpers/:id/reject
// @access  Private/Admin
const rejectHelper = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const helperProfile = await HelperProfile.findById(req.params.id);
    if (!helperProfile) {
      return res.status(404).json({ success: false, message: 'Helper profile not found.' });
    }

    helperProfile.status = 'rejected';
    helperProfile.verified = false;
    helperProfile.rejectionReason = reason || 'ID proof or background verification details did not match our safety criteria.';
    await helperProfile.save();

    await Notification.create({
      user: helperProfile.user,
      title: 'Verification Update ❌',
      message: `Your helper registration could not be approved. Reason: ${helperProfile.rejectionReason}`,
      type: 'account',
    });

    res.status(200).json({
      success: true,
      message: 'Helper profile marked as rejected.',
      data: helperProfile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Bookings (Admin)
// @route   GET /api/admin/bookings
// @access  Private/Admin
const getAllBookings = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const total = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .populate('customer', 'fullName email phone')
      .populate('helper', 'fullName email phone')
      .populate('services.service', 'name')
      .populate('payment')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Contact Messages (Admin)
// @route   GET /api/admin/messages
// @access  Private/Admin
const getContactMessages = async (req, res, next) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: messages.length, data: messages });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Contact Message Status / Note
// @route   PUT /api/admin/messages/:id
// @access  Private/Admin
const updateContactMessage = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const msg = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status, adminNotes },
      { new: true }
    );
    res.status(200).json({ success: true, data: msg });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Complaints (Admin)
// @route   GET /api/admin/complaints
// @access  Private/Admin
const getComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find()
      .populate('complaintBy', 'fullName email phone role')
      .populate('booking')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: complaints.length, data: complaints });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Complaint Status
// @route   PUT /api/admin/complaints/:id
// @access  Private/Admin
const updateComplaint = async (req, res, next) => {
  try {
    const { status, resolutionNotes } = req.body;
    const comp = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status, resolutionNotes },
      { new: true }
    );
    res.status(200).json({ success: true, data: comp });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Reviews Moderation
// @route   GET /api/admin/reviews
// @access  Private/Admin
const getReviewsModeration = async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .populate('customer', 'fullName email')
      .populate('helper', 'fullName email')
      .populate('booking', 'bookingNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Review Status (hide / approve / flag)
// @route   PUT /api/admin/reviews/:id
// @access  Private/Admin
const updateReviewStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const review = await Review.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

// @desc    Manage Coupons (List, Create, Delete)
// @route   GET /api/admin/coupons
// @access  Private/Admin
const getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: coupons.length, data: coupons });
  } catch (error) {
    next(error);
  }
};

const createCoupon = async (req, res, next) => {
  try {
    const { code, discountType, discountValue, minBookingAmount, maxDiscount, validTo } = req.body;
    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists.' });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue),
      minBookingAmount: Number(minBookingAmount || 0),
      maxDiscount: Number(maxDiscount || 500),
      validTo: validTo ? new Date(validTo) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      active: true,
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    next(error);
  }
};

const deleteCoupon = async (req, res, next) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Coupon removed.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminStats,
  getPublicLiveStats,
  getUsers,
  updateUserStatus,
  getHelperApprovalQueue,
  approveHelper,
  rejectHelper,
  getAllBookings,
  getContactMessages,
  updateContactMessage,
  getComplaints,
  updateComplaint,
  getReviewsModeration,
  updateReviewStatus,
  getCoupons,
  createCoupon,
  deleteCoupon,
};
