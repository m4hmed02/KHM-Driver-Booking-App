const Booking = require('../models/Booking');

exports.createBooking = async (customerId, bookingData) => {
  const booking = await Booking.create({
    customer: customerId,
    ...bookingData,
    status: 'requesting',
  });
  return booking;
};

exports.getAvailableBookings = async () => {
  return await Booking.find({ status: 'requesting' })
    .populate('customer', 'name phone avatar')
    .sort({ createdAt: -1 });
};

exports.makeDriverOffer = async (bookingId, driverId, fare) => {
  const booking = await Booking.findById(bookingId);
  if (!booking || booking.status !== 'requesting') {
    const error = new Error('Booking is no longer available');
    error.statusCode = 400;
    throw error;
  }

  // Check if this driver already made an offer, update it if so. Otherwise, add new.
  const existingOfferIndex = booking.offers.findIndex(o => o.driver.toString() === driverId.toString());
  if (existingOfferIndex >= 0) {
    booking.offers[existingOfferIndex].fare = fare;
  } else {
    booking.offers.push({ driver: driverId, fare });
  }

  await booking.save();
  
  // Return booking with populated driver info so customer can see who made the offer
  return await Booking.findById(bookingId)
    .populate('offers.driver', 'name phone avatar rating') 
    .populate('customer', 'name phone avatar');
};

exports.acceptDriverOffer = async (bookingId, customerId, driverId) => {
  const booking = await Booking.findById(bookingId);
  
  if (!booking || booking.customer.toString() !== customerId.toString()) {
    const error = new Error('Unauthorized or booking not found');
    error.statusCode = 403;
    throw error;
  }
  if (booking.status !== 'requesting') {
    const error = new Error('Booking already processed');
    error.statusCode = 400;
    throw error;
  }

  // Find the specific offer the customer selected
  const acceptedOffer = booking.offers.find(o => o.driver.toString() === driverId.toString());
  if (!acceptedOffer) {
    const error = new Error('Offer not found');
    error.statusCode = 404;
    throw error;
  }

  // Lock in the driver and the negotiated fare
  booking.driver = acceptedOffer.driver;
  booking.estimatedFare = acceptedOffer.fare;
  booking.status = 'accepted';
  acceptedOffer.status = 'accepted';

  await booking.save();
  
  return await Booking.findById(bookingId)
    .populate('driver', 'name phone avatar')
    .populate('customer', 'name phone avatar');
};

exports.getBookingStatus = async (bookingId) => {
  const booking = await Booking.findById(bookingId)
    .populate('driver', 'name phone avatar')
    .populate('customer', 'name phone avatar')
    .populate('offers.driver', 'name phone avatar');
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }
  return booking;
};

exports.updateBookingStatus = async (bookingId, status) => {
  const booking = await Booking.findByIdAndUpdate(
    bookingId,
    { status },
    { new: true }
  )
  .populate('driver', 'name phone avatar')
  .populate('customer', 'name phone avatar');
  return booking;
};