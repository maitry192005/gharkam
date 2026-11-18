const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const {
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
} = require('../controllers/adminController');

// Public stats endpoint for homepage
router.get('/public-stats', getPublicLiveStats);

// All other endpoints require Admin role
router.use(requireAuth, requireRole('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);

// Helper Approval
router.get('/helpers/pending', getHelperApprovalQueue);
router.put('/helpers/:id/approve', approveHelper);
router.put('/helpers/:id/reject', rejectHelper);

// Bookings
router.get('/bookings', getAllBookings);

// Messages, Complaints & Reviews
router.get('/messages', getContactMessages);
router.put('/messages/:id', updateContactMessage);
router.get('/complaints', getComplaints);
router.put('/complaints/:id', updateComplaint);
router.get('/reviews', getReviewsModeration);
router.put('/reviews/:id', updateReviewStatus);

// Coupons
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.delete('/coupons/:id', deleteCoupon);

module.exports = router;
