require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const User = require('./models/User');
const HelperProfile = require('./models/HelperProfile');

// Initialize app
const app = express();

// Connect to MongoDB
connectDB();

// Security headers with customized CSP allowing CDNs used by GharKaam
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://cdn.jsdelivr.net',
                'https://cdnjs.cloudflare.com',
                'https://checkout.razorpay.com',
              ],
              styleSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://cdn.jsdelivr.net',
                'https://fonts.googleapis.com',
                'https://cdnjs.cloudflare.com',
              ],
              fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.gstatic.com', 'data:'],
              imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', 'https://cdn.jsdelivr.net'],
              connectSrc: ["'self'", 'https://lgd-json-api.vercel.app', 'https://api.razorpay.com'],
              frameSrc: ["'self'", 'https://api.razorpay.com'],
              'upgrade-insecure-requests': null,
            },
          }
        : false,
    hsts: process.env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false,
  })
);

// Logging in dev mode
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Body and Cookie Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Server-side route protection middleware for private HTML dashboard pages
const serverRouteGuard = async (req, res, next) => {
  const token = req.cookies.token;
  const targetPath = req.path.toLowerCase();

  // Guard customer pages
  const customerProtected = [
    '/customer-dashboard.html',
    '/book.html',
    '/my-bookings.html',
    '/saved-helpers.html',
    '/customer-profile.html',
  ];

  // Guard helper pages
  const helperProtected = [
    '/helper-dashboard.html',
    '/helper-requests.html',
    '/helper-schedule.html',
    '/helper-services.html',
    '/helper-earnings.html',
    '/helper-reviews.html',
    '/helper-profile-edit.html',
  ];

  // Guard admin pages
  const adminProtected = ['/admin', '/admin/', '/admin/index.html'];

  if (customerProtected.includes(targetPath) || helperProtected.includes(targetPath) || adminProtected.includes(targetPath)) {
    if (!token) {
      return res.redirect(`/login.html?redirect=${encodeURIComponent(req.path)}`);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gharkaam_super_secure_jwt_secret_key_2026_xyz');
      const user = await User.findById(decoded.id);

      if (!user || user.status === 'suspended') {
        return res.redirect('/login.html?msg=unauthorized');
      }

      // Check role constraints
      if (adminProtected.includes(targetPath) && user.role !== 'admin') {
        return res.redirect('/login.html?msg=admin_only');
      }

      if (helperProtected.includes(targetPath)) {
        if (user.role !== 'helper') {
          return res.redirect('/customer-dashboard.html');
        }
        // Check if helper is pending approval
        const profile = await HelperProfile.findOne({ user: user._id });
        if (profile && profile.status !== 'approved' && !targetPath.includes('helper-waiting')) {
          return res.redirect('/helper-waiting.html');
        }
      }

      if (customerProtected.includes(targetPath) && user.role !== 'customer' && user.role !== 'admin') {
        return res.redirect('/helper-dashboard.html');
      }
    } catch (e) {
      return res.redirect(`/login.html?redirect=${encodeURIComponent(req.path)}`);
    }
  }

  next();
};

app.use(serverRouteGuard);

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/helpers', require('./routes/helperRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Route to force unregister and self-destruct any stale service worker
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Clear-Site-Data', '"cache"');
  res.sendFile(path.join(__dirname, '..', 'public', 'sw.js'));
});

// Serve Static Frontend with strict no-cache headers for dev assets to prevent UI styling loss
const publicPath = path.join(__dirname, '..', 'public');
app.use(
  express.static(publicPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Clear-Site-Data', '"cache"');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  })
);

// 404 Fallback for HTML requests or APIs
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.status(404).sendFile(path.join(publicPath, '404.html'));
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 GharKaam Backend Server running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = { app, server };
