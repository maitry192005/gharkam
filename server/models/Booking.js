const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    helper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    services: [
      {
        service: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Service',
          required: true,
        },
        rate: {
          type: Number,
          required: true,
        },
      },
    ],
    workFrom: {
      type: Date,
      required: true,
    },
    workTo: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },
    preferredTime: {
      type: String,
      default: 'Morning (8:00 AM - 12:00 PM)',
    },
    cookingDetails: {
      isCooking: { type: Boolean, default: false },
      preference: {
        type: String,
        enum: ['veg', 'non-veg', 'both', 'none'],
        default: 'none',
      },
      peopleCount: { type: Number, default: 2 },
    },
    address: {
      addressLine: { type: String, required: true },
      landmark: { type: String, default: '' },
      district: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    notes: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    pricing: {
      servicesSubtotal: { type: Number, required: true },
      daysCount: { type: Number, required: true },
      subtotal: { type: Number, required: true },
      platformFee: { type: Number, required: true }, // 5%
      tax: { type: Number, required: true }, // 18% GST
      discount: { type: Number, default: 0 },
      emergencySurcharge: { type: Number, default: 0 },
      walletUsed: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
    },
    isEmergency: {
      type: Boolean,
      default: false,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringType: {
      type: String,
      enum: ['none', 'daily', 'weekly'],
      default: 'none',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in-progress', 'completed', 'declined', 'cancelled', 'expired'],
      default: 'pending',
      index: true,
    },
    helperResponseComment: {
      type: String,
      default: '',
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    hasReview: {
      type: Boolean,
      default: false,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index to help check overlapping active bookings for a helper
bookingSchema.index({ helper: 1, workFrom: 1, workTo: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
