const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['login', 'register'],
    required: true,
  },
  pendingPassword: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    default: 'customer',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // 10 minutes TTL
  },
});

module.exports = mongoose.model('Otp', otpSchema);
