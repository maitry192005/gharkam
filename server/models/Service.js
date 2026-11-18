const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      default: 'Domestic Help',
      index: true,
    },
    icon: {
      type: String,
      default: 'bi-house-heart',
    },
    image: {
      type: String,
      default: 'service-cleaning.jpg',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    whatIsIncluded: {
      type: [String],
      default: [],
    },
    baseRate: {
      type: Number,
      required: [true, 'Base rate is required'],
      min: 50,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
