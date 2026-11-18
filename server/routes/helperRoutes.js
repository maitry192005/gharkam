const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const {
  getHelpers,
  getHelperById,
  toggleAvailability,
  updateHelperServices,
  getHelperSchedule,
  getHelperEarnings,
  getHelperDashboard,
} = require('../controllers/helperController');

// Public Browse & Helper Details
router.get('/', getHelpers);
router.get('/profile/:id', getHelperById);

// Helper Dashboard & Actions (Requires Role 'helper')
router.get('/dashboard', requireAuth, requireRole('helper'), getHelperDashboard);
router.put('/availability', requireAuth, requireRole('helper'), toggleAvailability);
router.put('/services', requireAuth, requireRole('helper'), updateHelperServices);
router.get('/schedule', requireAuth, requireRole('helper'), getHelperSchedule);
router.get('/earnings', requireAuth, requireRole('helper'), getHelperEarnings);

module.exports = router;
