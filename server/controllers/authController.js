const crypto = require('crypto');
const User = require('../models/User');
const HelperProfile = require('../models/HelperProfile');
const Service = require('../models/Service');
const PasswordReset = require('../models/PasswordReset');
const Notification = require('../models/Notification');
const { sendTokenResponse, clearTokenCookie } = require('../utils/jwt');
const {
  sendEmail,
  sendCustomerWelcomeEmail,
  sendHelperWelcomeEmail,
} = require('../utils/email');

// @desc    Register a new Customer
// @route   POST /api/auth/register-customer
// @access  Public
const registerCustomer = async (req, res, next) => {
  try {
    const {
      username,
      fullName,
      email,
      phone,
      password,
      gender,
      state,
      district,
      addressLine,
      landmark,
      pincode,
      houseType,
      referredBy,
    } = req.body;

    // Check duplicate
    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }, { phone }],
    });
    if (existing) {
      if (existing.email === email.toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Email is already registered.' });
      }
      if (existing.username === username.toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Username is already taken.' });
      }
      if (existing.phone === phone) {
        return res.status(400).json({ success: false, message: 'Phone number is already registered.' });
      }
    }

    // Handle referral
    let referrer = null;
    if (referredBy) {
      referrer = await User.findOne({ referralCode: referredBy.trim().toUpperCase() });
    }

    const user = await User.create({
      username: username.toLowerCase().trim(),
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      role: 'customer',
      gender: gender || 'prefer-not-to-say',
      status: 'active',
      address: {
        state: state || '',
        district: district || '',
        addressLine: addressLine || '',
        landmark: landmark || '',
        pincode: pincode || '',
        houseType: houseType || 'Apartment',
      },
      referredBy: referrer ? referrer.referralCode : null,
      walletBalance: 50, // ₹50 welcome reward
    });

    if (referrer) {
      referrer.walletBalance += 50; // Give referrer ₹50 reward
      await referrer.save();
      await Notification.create({
        user: referrer._id,
        title: 'Referral Reward Earned! 🎉',
        message: `${user.fullName} joined using your referral code. ₹50 bonus credits added to your wallet!`,
        type: 'account',
      });
    }

    await Notification.create({
      user: user._id,
      title: 'Welcome to GharKaam! 🏡',
      message: 'Your account is ready! We have credited ₹50 in bonus wallet rewards for your first booking.',
      type: 'account',
    });

    // Send Welcome Email
    sendCustomerWelcomeEmail(user).catch((err) =>
      console.error('[Email Notification Error] Customer welcome email failed:', err.message)
    );

    sendTokenResponse(user, 201, res, 'Customer account created successfully.');
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new Helper
// @route   POST /api/auth/register-helper
// @access  Public
const registerHelper = async (req, res, next) => {
  try {
    const {
      username,
      fullName,
      email,
      phone,
      password,
      gender,
      state,
      district,
      addressLine,
      landmark,
      pincode,
      houseType,
      experience,
      languages,
      bio,
      services, // Array or JSON string of [{ serviceId, rate }]
      areas,
      idProofType,
    } = req.body;

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }, { phone }],
    });
    if (existing) {
      if (existing.email === email.toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Email is already registered.' });
      }
      if (existing.username === username.toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Username is already taken.' });
      }
      if (existing.phone === phone) {
        return res.status(400).json({ success: false, message: 'Phone number is already registered.' });
      }
    }

    let avatarPath = '';
    let idProofDocPath = '';

    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        avatarPath = `/assets/uploads/profiles/${req.files.avatar[0].filename}`;
      }
      if (req.files.idProof && req.files.idProof[0]) {
        idProofDocPath = `/assets/uploads/idproofs/${req.files.idProof[0].filename}`;
      }
    }

    const user = await User.create({
      username: username.toLowerCase().trim(),
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      role: 'helper',
      gender: gender || 'prefer-not-to-say',
      status: 'pending', // Helper requires admin verification
      avatar: avatarPath,
      address: {
        state: state || '',
        district: district || '',
        addressLine: addressLine || '',
        landmark: landmark || '',
        pincode: pincode || '',
        houseType: houseType || 'Independent House',
      },
      walletBalance: 0,
    });

    // Parse services
    let parsedServices = [];
    if (services) {
      try {
        parsedServices = typeof services === 'string' ? JSON.parse(services) : services;
      } catch (e) {
        parsedServices = [];
      }
    }

    // Format services with ObjectId
    const formattedServices = [];
    if (Array.isArray(parsedServices)) {
      for (const item of parsedServices) {
        if (item.serviceId) {
          formattedServices.push({
            service: item.serviceId,
            rate: Number(item.rate || 300),
          });
        }
      }
    }

    // Parse languages
    let parsedLangs = ['Hindi'];
    if (languages) {
      parsedLangs = Array.isArray(languages)
        ? languages
        : typeof languages === 'string'
        ? languages.split(',').map((l) => l.trim()).filter(Boolean)
        : ['Hindi'];
    }

    // Parse areas
    let parsedAreas = [];
    if (areas) {
      parsedAreas = Array.isArray(areas)
        ? areas
        : typeof areas === 'string'
        ? areas.split(',').map((a) => a.trim()).filter(Boolean)
        : [];
    }

    await HelperProfile.create({
      user: user._id,
      services: formattedServices,
      experience: Number(experience || 1),
      languages: parsedLangs,
      bio: bio || 'Reliable and experienced household helper ready to assist you.',
      areas: parsedAreas.length ? parsedAreas : [district || 'Local'],
      isAvailable: true,
      status: 'pending',
      verified: false,
      idProofPath: idProofDocPath,
      idProofType: idProofType || 'Aadhaar',
    });

    await Notification.create({
      user: user._id,
      title: 'Registration Submitted for Review ⏳',
      message: 'Your helper profile and ID proof have been received. Our admin team will verify your details within 24 hours.',
      type: 'account',
    });

    // Send Welcome Email to Helper
    sendHelperWelcomeEmail(user).catch((err) =>
      console.error('[Email Notification Error] Helper welcome email failed:', err.message)
    );

    sendTokenResponse(user, 201, res, 'Helper profile submitted. Awaiting administrative approval.');
  } catch (error) {
    next(error);
  }
};

// @desc    Login user (Customer, Helper, or Admin)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const loginId = req.body.loginId || req.body.login || req.body.email;
    const password = req.body.password;

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email/username and password.',
      });
    }

    const cleanLoginId = loginId.trim().toLowerCase();

    // Check user with password included
    const user = await User.findOne({
      $or: [{ email: cleanLoginId }, { username: cleanLoginId }],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username/email.',
      });
    }

    // Check account lockout
    if (user.isLocked()) {
      const waitMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to excessive failed attempts. Try again in ${waitMinutes} minute(s).`,
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
      }
      await user.save();

      return res.status(401).json({
        success: false,
        message: `Invalid password. ${5 - (user.loginAttempts % 5)} attempts remaining before temporary lockout.`,
      });
    }

    // Reset login attempts on success
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // Attach HelperProfile if role is helper
    let helperStatus = null;
    if (user.role === 'helper') {
      const hp = await HelperProfile.findOne({ user: user._id });
      if (hp) {
        helperStatus = hp.status;
      }
    }

    sendTokenResponse(user, 200, res, 'Login successful.');
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user & clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logout = async (req, res) => {
  clearTokenCookie(res);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

// @desc    Get currently logged in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let helperProfile = null;

    if (user.role === 'helper') {
      helperProfile = await HelperProfile.findOne({ user: user._id }).populate('services.service');
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        helperProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password Request
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide your registered email.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Return success for security obfuscation
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, password reset instructions have been sent.',
      });
    }

    // Generate random reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save token for 1 hour
    await PasswordReset.create({
      user: user._id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    const messageText = `You are receiving this email because you requested a password reset for your GharKaam account.\n\nPlease click on the following link or paste it into your browser to complete the process:\n\n${resetUrl}\n\nThis link will expire in 60 minutes.\n\nIf you did not request this, please ignore this email.`;

    await sendEmail({
      to: user.email,
      subject: 'GharKaam - Password Reset Request',
      text: messageText,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #26372f;">
          <h2 style="color: #245a46;">Password Reset Request</h2>
          <p>Hello ${user.fullName},</p>
          <p>We received a request to reset your password for your <strong>GharKaam</strong> account.</p>
          <p>
            <a href="${resetUrl}" style="background-color: #34775f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </p>
          <p>Or paste this link into your browser:<br><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link is valid for 60 minutes. If you did not make this request, you can safely ignore this email.</p>
        </div>
      `,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your registered email address.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password with Token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token, email, password } = req.body;
    if (!token || !email || !password) {
      return res.status(400).json({ success: false, message: 'Invalid or missing reset token parameters.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid reset link.' });
    }

    const record = await PasswordReset.findOne({
      user: user._id,
      token: hashedToken,
      used: false,
      expiresAt: { $gt: Date.now() },
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired. Please request a new one.',
      });
    }

    user.password = password;
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    record.used = true;
    await record.save();

    await Notification.create({
      user: user._id,
      title: 'Password Changed Successfully 🔒',
      message: 'Your account password was updated. If this was not you, contact GharKaam support immediately.',
      type: 'account',
    });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You may now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change Password (Logged In)
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both current and new passwords.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    user.password = newPassword;
    await user.save();

    await Notification.create({
      user: user._id,
      title: 'Password Updated 🔑',
      message: 'Your account password was successfully changed.',
      type: 'account',
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerCustomer,
  registerHelper,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
};
