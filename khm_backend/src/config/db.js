const mongoose = require('mongoose');
const Booking = require('../models/Booking');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Booking.updateMany(
      { status: 'requesting', expiresAt: null },
      [{
        $set: {
          expiresAt: {
            $add: [{ $ifNull: ['$createdAt', new Date()] }, 120_000],
          },
        },
      }],
      { updatePipeline: true }
    );
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;