const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getBookingMessages, sendMessage } = require('../controllers/chatController');

router.get('/:bookingId', requireAuth, getBookingMessages);
router.post('/:bookingId', requireAuth, sendMessage);

module.exports = router;
