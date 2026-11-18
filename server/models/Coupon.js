const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: true,
      min: 1,
    },
    minBookingAmount: {
      type: Number,
      default: 0,
    },
    maxDiscount: {
      type: Number,
      default: 1000,
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validTo: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days default
    },
    usageLimit: {
      type: Number,
      default: 500,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
