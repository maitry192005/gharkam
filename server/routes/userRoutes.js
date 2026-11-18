const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const {
  updateProfile,
  updateHelperDetails,
  getSavedHelpers,
  toggleFavourite,
  getUserAddresses,
  addAddress,
  deleteAddress,
} = require('../controllers/userController');

router.put('/profile', requireAuth, upload.single('avatar'), updateProfile);
router.put('/helper-profile', requireAuth, requireRole('helper'), updateHelperDetails);

// Favourites
router.get('/favourites', requireAuth, requireRole('customer'), getSavedHelpers);
router.post('/favourites/:helperId', requireAuth, requireRole('customer'), toggleFavourite);

// Addresses
router.get('/addresses', requireAuth, getUserAddresses);
router.post('/addresses', requireAuth, addAddress);
router.delete('/addresses/:id', requireAuth, deleteAddress);

module.exports = router;
