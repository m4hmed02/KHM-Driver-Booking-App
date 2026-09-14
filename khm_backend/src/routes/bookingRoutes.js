const express = require('express');
const router = express.Router();
const {
  createBooking,
  getAvailableBookings,
  getBookingStatus,
  updateBookingStatus,
  makeDriverOffer,
  acceptDriverOffer
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createBooking);
router.get('/available', protect, getAvailableBookings);
router.get('/:id', protect, getBookingStatus);
router.patch('/:id/status', protect, updateBookingStatus);

// Bidding Routes
router.post('/:id/offers', protect, makeDriverOffer); // Driver submits/updates a fare
router.patch('/:id/accept-offer', protect, acceptDriverOffer); // Customer accepts a specific driver's offer

module.exports = router;