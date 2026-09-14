const mongoose = require('mongoose');

const fareSettingSchema = new mongoose.Schema({
  vehicleType: { 
    type: String, 
    required: true, 
    unique: true, 
    default: 'standard' 
  },
  baseFare: { type: Number, required: true, default: 0 },
  perKmRate: { type: Number, required: true, default: 0 },
  perMinuteRate: { type: Number, required: true, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('FareSetting', fareSettingSchema);