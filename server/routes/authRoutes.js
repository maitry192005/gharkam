const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const upload = require('../middleware/upload');
const { authLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');
const {
  registerCustomer,
  registerHelper,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
} = require('../controllers/authController');

const validate = (validations) => {
  return async (req, res, next) => {
    for (let validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  };
};

// Customer Registration
router.post(
  '/register-customer',
  authLimiter,
  validate([
    body('username')
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('phone')
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Please enter a valid 10-digit Indian mobile number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ]),
  registerCustomer
);

// Helper Registration
router.post(
  '/register-helper',
  authLimiter,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'idProof', maxCount: 1 },
  ]),
  validate([
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit phone number is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ]),
  registerHelper
);

// Login
router.post(
  '/login',
  authLimiter,
  validate([
    body().custom((value, { req }) => {
      if (!req.body.loginId && !req.body.login && !req.body.email) {
        throw new Error('Username or email is required');
      }
      return true;
    }),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  login
);

// Logout
router.post('/logout', logout);

// Get current user profile
router.get('/me', requireAuth, getMe);

// Forgot Password
router.post(
  '/forgot-password',
  authLimiter,
  validate([body('email').isEmail().withMessage('Please enter a valid email address')]),
  forgotPassword
);

// Reset Password
router.post(
  '/reset-password',
  validate([
    body('token').notEmpty().withMessage('Token is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ]),
  resetPassword
);

// Change Password
router.put(
  '/change-password',
  requireAuth,
  validate([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ]),
  changePassword
);

module.exports = router;
