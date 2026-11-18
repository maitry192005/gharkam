const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  payAfterService,
  downloadInvoice,
} = require('../controllers/paymentController');

router.post('/create-order', requireAuth, createRazorpayOrder);
router.post('/verify', requireAuth, verifyRazorpayPayment);
router.post('/pay-after-service', requireAuth, payAfterService);
router.get('/invoice/:id', requireAuth, downloadInvoice);

module.exports = router;
