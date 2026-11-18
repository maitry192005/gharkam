const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email'],
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'helper', 'admin'],
      default: 'customer',
      index: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say'],
      default: 'prefer-not-to-say',
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'suspended'],
      default: function () {
        return this.role === 'helper' ? 'pending' : 'active';
      },
      index: true,
    },
    address: {
      state: { type: String, default: '' },
      district: { type: String, default: '', index: true },
      addressLine: { type: String, default: '' },
      landmark: { type: String, default: '' },
      pincode: { type: String, default: '', index: true },
      houseType: { type: String, default: 'Apartment' },
    },
    avatar: {
      type: String,
      default: '',
    },
    referralCode: {
      type: String,
      unique: true,
      index: true,
    },
    referredBy: {
      type: String,
      default: null,
    },
    walletBalance: {
      type: Number,
      default: 50, // Welcome ₹50 joining credit bonus
      min: 0,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate referral code before first save
userSchema.pre('validate', function (next) {
  if (!this.referralCode) {
    const cleanUser = (this.username || 'GK').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.referralCode = `${cleanUser}${rand}`;
  }
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if account is currently locked out
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

module.exports = mongoose.model('User', userSchema);
