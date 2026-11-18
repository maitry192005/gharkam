const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const {
  createBooking,
  getCustomerBookings,
  getHelperBookings,
  getBookingById,
  respondToBooking,
  updateBookingStatus,
  cancelBooking,
  validateCoupon,
} = require('../controllers/bookingController');

// Booking Operations
router.post('/', requireAuth, requireRole('customer'), createBooking);
router.post('/validate-coupon', requireAuth, validateCoupon);
router.get('/customer', requireAuth, requireRole('customer'), getCustomerBookings);
router.get('/helper', requireAuth, requireRole('helper'), getHelperBookings);
router.get('/:id', requireAuth, getBookingById);
router.put('/:id/respond', requireAuth, requireRole('helper'), respondToBooking);
router.put('/:id/status', requireAuth, updateBookingStatus);
router.put('/:id/cancel', requireAuth, cancelBooking);

module.exports = router;
