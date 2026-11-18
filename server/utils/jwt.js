const jwt = require('jsonwebtoken');

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const payload = {
    id: user._id,
    role: user.role,
    username: user.username,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET || 'gharkaam_super_secure_jwt_secret_key_2026_xyz', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  };

  res.cookie('token', token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    message,
    data: {
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        gender: user.gender,
        status: user.status,
        avatar: user.avatar,
        address: user.address,
        walletBalance: user.walletBalance,
        referralCode: user.referralCode,
      },
      token, // Also return in body for client token storage if needed
    },
  });
};

const clearTokenCookie = (res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    sameSite: 'lax',
  });
};

module.exports = {
  sendTokenResponse,
  clearTokenCookie,
};
