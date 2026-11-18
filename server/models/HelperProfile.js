const mongoose = require('mongoose');

const helperProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
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
          min: 100,
        },
      },
    ],
    experience: {
      type: Number,
      default: 1,
      min: 0,
      max: 50,
    },
    languages: {
      type: [String],
      default: ['Hindi', 'English'],
    },
    bio: {
      type: String,
      maxlength: 1000,
      default: 'Experienced and dependable home help professional dedicated to quality work.',
    },
    areas: {
      type: [String],
      default: [],
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    idProofPath: {
      type: String,
      default: '',
    },
    idProofType: {
      type: String,
      enum: ['Aadhaar', 'Voter ID', 'PAN Card', 'Driving License', 'Passport', 'Other'],
      default: 'Aadhaar',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    ratingAvg: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
      index: true,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    totalCompletedJobs: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HelperProfile', helperProfileSchema);
