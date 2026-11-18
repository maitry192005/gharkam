const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const {
  getAllServices,
  getServiceBySlug,
  createService,
  updateService,
  deleteService,
} = require('../controllers/serviceController');

router.get('/', getAllServices);
router.get('/:slug', getServiceBySlug);

// Admin Service Management
router.post('/', requireAuth, requireRole('admin'), createService);
router.put('/:id', requireAuth, requireRole('admin'), updateService);
router.delete('/:id', requireAuth, requireRole('admin'), deleteService);

module.exports = router;
