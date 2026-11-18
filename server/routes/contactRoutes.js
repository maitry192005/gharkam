const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  submitContactForm,
  submitFeedback,
  submitComplaint,
} = require('../controllers/contactController');

router.post('/', submitContactForm);
router.post('/feedback', requireAuth, submitFeedback);
router.post('/complaint', requireAuth, submitComplaint);

module.exports = router;
