const Review = require('../models/Review');
const Booking = require('../models/Booking');
const User = require('../models/User');
const HelperProfile = require('../models/HelperProfile');
const Notification = require('../models/Notification');
const { sendNewReviewToHelperEmail } = require('../utils/email');

// @desc    Add review for completed booking
// @route   POST /api/reviews
// @access  Private/Customer
const createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'Please provide booking ID, rating, and comment.' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the customer can review this booking.' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Reviews can only be submitted after the booking is completed.',
      });
    }

    const existingReview = await Review.findOne({ booking: booking._id });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'A review has already been submitted for this booking.' });
    }

    const numRating = Math.max(1, Math.min(5, Number(rating)));

    const review = await Review.create({
      booking: booking._id,
      customer: req.user._id,
      helper: booking.helper,
      rating: numRating,
      comment: comment.trim(),
      status: 'approved',
    });

    booking.hasReview = true;
    await booking.save();

    // Recalculate helper average rating
    const allHelperReviews = await Review.find({ helper: booking.helper, status: 'approved' });
    const count = allHelperReviews.length;
    const avg = allHelperReviews.reduce((sum, r) => sum + r.rating, 0) / count;

    await HelperProfile.findOneAndUpdate(
      { user: booking.helper },
      {
        ratingAvg: Number(avg.toFixed(1)),
        ratingCount: count,
      }
    );

    // Notify Helper via In-App Notification
    await Notification.create({
      user: booking.helper,
      title: 'New Review Received! ⭐',
      message: `${req.user.fullName} rated your service ${numRating} stars: "${comment.substring(0, 60)}..."`,
      type: 'review',
      link: `/helper-reviews.html`,
    });

    // Send Review Notification Email to Helper
    const helperUser = await User.findById(booking.helper);
    if (helperUser) {
      sendNewReviewToHelperEmail(helperUser, req.user, review, booking).catch((err) =>
        console.error('[Email Notification Error] Helper review email:', err.message)
      );
    }

    res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been published.',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reviews for a helper
// @route   GET /api/reviews/helper/:helperId
// @access  Public
const getHelperReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ helper: req.params.helperId, status: 'approved' })
      .populate('customer', 'fullName avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getHelperReviews,
};
