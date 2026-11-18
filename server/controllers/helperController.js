const HelperProfile = require('../models/HelperProfile');
const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');

// @desc    Browse & search helpers
// @route   GET /api/helpers
// @access  Public
const getHelpers = async (req, res, next) => {
  try {
    const {
      service,
      district,
      state,
      minRating,
      maxRate,
      minExp,
      language,
      availableOnly,
      sort,
      page = 1,
      limit = 9,
    } = req.query;

    let profileQuery = { status: 'approved' };

    if (availableOnly === 'true' || availableOnly === true) {
      profileQuery.isAvailable = true;
    }

    if (minRating) {
      profileQuery.ratingAvg = { $gte: Number(minRating) };
    }

    if (minExp) {
      profileQuery.experience = { $gte: Number(minExp) };
    }

    if (language) {
      profileQuery.languages = { $in: [new RegExp(language, 'i')] };
    }

    // Service filter (slug or ObjectId)
    if (service && service !== 'all') {
      let serviceId = service;
      if (!service.match(/^[0-9a-fA-F]{24}$/)) {
        const foundService = await Service.findOne({ slug: service.toLowerCase() });
        if (foundService) {
          serviceId = foundService._id;
        }
      }
      profileQuery['services.service'] = serviceId;
    }

    // Rate filter
    if (maxRate) {
      profileQuery['services.rate'] = { $lte: Number(maxRate) };
    }

    // Sorting
    let sortOptions = { ratingAvg: -1, totalCompletedJobs: -1 };
    if (sort === 'rating') sortOptions = { ratingAvg: -1 };
    else if (sort === 'experience') sortOptions = { experience: -1 };
    else if (sort === 'jobs') sortOptions = { totalCompletedJobs: -1 };
    else if (sort === 'rate-asc') sortOptions = { 'services.rate': 1 };
    else if (sort === 'rate-desc') sortOptions = { 'services.rate': -1 };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    // We also need to filter by user district if provided
    let userFilter = { role: 'helper' };
    if (district && district !== 'all') {
      userFilter['address.district'] = new RegExp(district, 'i');
    }
    if (state && state !== 'all') {
      userFilter['address.state'] = new RegExp(state, 'i');
    }

    const matchingUsers = await User.find(userFilter).select('_id');
    const userIds = matchingUsers.map((u) => u._id);
    profileQuery.user = { $in: userIds };

    const total = await HelperProfile.countDocuments(profileQuery);
    const helpers = await HelperProfile.find(profileQuery)
      .populate('user', 'username fullName email avatar address phone gender')
      .populate('services.service', 'name slug icon baseRate')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      count: helpers.length,
      data: helpers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Helper Public Profile & Details
// @route   GET /api/helpers/:id
// @access  Public
const getHelperById = async (req, res, next) => {
  try {
    const helperId = req.params.id;

    // Helper ID can be HelperProfile _id OR User _id
    let profile = await HelperProfile.findOne({
      $or: [{ _id: helperId.match(/^[0-9a-fA-F]{24}$/) ? helperId : null }, { user: helperId.match(/^[0-9a-fA-F]{24}$/) ? helperId : null }],
    })
      .populate('user', 'username fullName avatar address phone gender createdAt')
      .populate('services.service', 'name slug icon baseRate description');

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Helper profile not found.' });
    }

    // Get approved customer reviews
    const reviews = await Review.find({ helper: profile.user._id, status: 'approved' })
      .populate('customer', 'fullName avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        profile,
        reviews,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Helper Availability
// @route   PUT /api/helpers/availability
// @access  Private/Helper
const toggleAvailability = async (req, res, next) => {
  try {
    const { isAvailable } = req.body;
    const profile = await HelperProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Helper profile not found.' });
    }

    profile.isAvailable = typeof isAvailable === 'boolean' ? isAvailable : !profile.isAvailable;
    await profile.save();

    res.status(200).json({
      success: true,
      message: `Availability updated to ${profile.isAvailable ? 'Available' : 'Busy / Away'}.`,
      isAvailable: profile.isAvailable,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Helper Services & Rates
// @route   PUT /api/helpers/services
// @access  Private/Helper
const updateHelperServices = async (req, res, next) => {
  try {
    const { services } = req.body;
    const profile = await HelperProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Helper profile not found.' });
    }

    if (!Array.isArray(services)) {
      return res.status(400).json({ success: false, message: 'Services must be an array of { serviceId, rate }.' });
    }

    profile.services = services.map((s) => ({
      service: s.serviceId || s.service,
      rate: Number(s.rate || 300),
    }));

    await profile.save();
    const updated = await HelperProfile.findOne({ user: req.user._id }).populate('services.service');

    res.status(200).json({
      success: true,
      message: 'Services and rates updated successfully.',
      data: updated.services,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Helper Schedule
// @route   GET /api/helpers/schedule
// @access  Private/Helper
const getHelperSchedule = async (req, res, next) => {
  try {
    const bookings = await Booking.find({
      helper: req.user._id,
      status: { $in: ['accepted', 'in-progress'] },
    })
      .populate('customer', 'fullName phone address')
      .populate('services.service', 'name icon')
      .sort({ workFrom: 1 });

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Helper Earnings Breakdown
// @route   GET /api/helpers/earnings
// @access  Private/Helper
const getHelperEarnings = async (req, res, next) => {
  try {
    const payments = await Payment.find({
      helper: req.user._id,
      status: 'completed',
    })
      .populate('booking')
      .sort({ paidAt: -1 });

    const totalEarned = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // Group by month
    const monthlyEarnings = {};
    payments.forEach((p) => {
      const date = new Date(p.paidAt || p.createdAt);
      const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      monthlyEarnings[key] = (monthlyEarnings[key] || 0) + p.amount;
    });

    res.status(200).json({
      success: true,
      data: {
        totalEarned,
        totalPayments: payments.length,
        monthlyBreakdown: monthlyEarnings,
        recentPayments: payments.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Helper Dashboard Stats
// @route   GET /api/helpers/dashboard
// @access  Private/Helper
const getHelperDashboard = async (req, res, next) => {
  try {
    const profile = await HelperProfile.findOne({ user: req.user._id }).populate('services.service');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Helper profile not found.' });
    }

    const pendingRequests = await Booking.countDocuments({
      helper: req.user._id,
      status: 'pending',
    });

    const activeJobs = await Booking.countDocuments({
      helper: req.user._id,
      status: { $in: ['accepted', 'in-progress'] },
    });

    const completedJobs = await Booking.countDocuments({
      helper: req.user._id,
      status: 'completed',
    });

    const payments = await Payment.find({ helper: req.user._id, status: 'completed' });
    const totalEarnings = payments.reduce((acc, curr) => acc + curr.amount, 0);

    const recentBookings = await Booking.find({ helper: req.user._id })
      .populate('customer', 'fullName phone address')
      .populate('services.service', 'name icon')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        profile,
        pendingRequests,
        activeJobs,
        completedJobs,
        totalEarnings,
        ratingAvg: profile.ratingAvg,
        isAvailable: profile.isAvailable,
        status: profile.status,
        verified: profile.verified,
        recentBookings,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHelpers,
  getHelperById,
  toggleAvailability,
  updateHelperServices,
  getHelperSchedule,
  getHelperEarnings,
  getHelperDashboard,
};
