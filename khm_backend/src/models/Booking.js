const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  pickupLocation: {
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  dropoffLocation: {
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },

  bookingType: {
    type: String,
    enum: ['driver_now', 'schedule_driver'],
    default: 'driver_now',
  },
  scheduledTime: { type: Date, default: null },

  vehicleInfo: {
    make: String,
    model: String,
    plateNumber: String,
  },

  // The customer's initial fare offer or final agreed fare
  estimatedFare: { type: Number, default: 0 },

  // Array to hold bidding offers from different drivers
  offers: [{
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fare: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
  }],

  status: {
    type: String,
    enum: ['requesting', 'accepted', 'arriving', 'started', 'completed', 'cancelled'],
    default: 'requesting',
  },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);