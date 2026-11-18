const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { createReview, getHelperReviews } = require('../controllers/reviewController');

router.post('/', requireAuth, requireRole('customer'), createReview);
router.get('/helper/:helperId', getHelperReviews);

module.exports = router;
