const express = require('express');
const router = express.Router();
const {
  createBooking,
  getAvailableBookings,
  getScheduledBookings,
  getMyBookings,
  getBookingStatus,
  deleteBooking,
  updateBookingStatus,
  makeDriverOffer,
  acceptDriverOffer,
  acceptScheduledBooking,
  rejectDriverOffer,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createBooking);
router.get('/available', protect, getAvailableBookings);     // driver_now only
router.get('/scheduled', protect, getScheduledBookings);    // schedule_driver only
router.get('/my', protect, getMyBookings);                  // customer's own bookings
router.delete('/:id', protect, deleteBooking);
router.get('/:id', protect, getBookingStatus);
router.patch('/:id/status', protect, updateBookingStatus);

// Bidding routes (driver_now)
router.post('/:id/offers', protect, makeDriverOffer);
router.patch('/:id/accept-offer', protect, acceptDriverOffer);
router.patch('/:id/reject-offer', protect, rejectDriverOffer);

// Scheduled ride — direct accept (no bidding)
router.patch('/:id/accept-scheduled', protect, acceptScheduledBooking);

module.exports = router;
