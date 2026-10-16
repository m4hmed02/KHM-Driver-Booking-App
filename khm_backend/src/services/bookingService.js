const Booking = require('../models/Booking');

exports.createBooking = async (customerId, bookingData) => {
  const isScheduled = bookingData.bookingType === 'schedule_driver';
  const booking = await Booking.create({
    customer: customerId,
    ...bookingData,
    // Scheduled rides must NOT expire — they sit in 'requesting' until a driver
    // accepts them or the customer cancels. Only driver_now rides get the 2-min TTL.
    expiresAt: isScheduled ? null : new Date(Date.now() + 120_000),
    status: 'requesting',
  });
  return booking;
};

exports.deleteBooking = async (bookingId, customerId) => {
  const deletedBooking = await Booking.findOneAndDelete({
    _id: bookingId,
    customer: customerId,
    status: 'requesting',
  });

  if (deletedBooking) return;

  const existingBooking = await Booking.findById(bookingId).select('customer');
  if (!existingBooking) return;

  if (existingBooking.customer.toString() !== customerId.toString()) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  const error = new Error('Booking is no longer pending and cannot be deleted');
  error.statusCode = 409;
  throw error;
};

// Only immediate (driver_now) bookings go into the live feed.
exports.getAvailableBookings = async () => {
  return await Booking.find({ status: 'requesting', bookingType: 'driver_now' })
    .populate('customer', 'name phone avatar')
    .sort({ createdAt: -1 });
};

// Scheduled bookings — shown in the driver's separate "Scheduled" tab.
// Returns all future scheduled rides still waiting for a driver.
exports.getScheduledBookings = async () => {
  return await Booking.find({ status: 'requesting', bookingType: 'schedule_driver' })
    .populate('customer', 'name phone avatar')
    .sort({ scheduledTime: 1 }); // soonest first
};

// Driver directly accepts a scheduled ride (no bidding — first come first served).
exports.acceptScheduledBooking = async (bookingId, driverId) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }
  if (booking.bookingType !== 'schedule_driver') {
    const error = new Error('This booking is not a scheduled ride');
    error.statusCode = 400;
    throw error;
  }
  if (booking.status !== 'requesting') {
    const error = new Error('This ride has already been accepted');
    error.statusCode = 409;
    throw error;
  }

  booking.driver = driverId;
  booking.status = 'accepted';
  booking.expiresAt = null;
  await booking.save();

  return await Booking.findById(bookingId)
    .populate('driver', 'name phone avatar')
    .populate('customer', 'name phone avatar');
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
  booking.expiresAt = null;
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

exports.getMyBookings = async (customerId) => {
  return await Booking.find({ customer: customerId })
    .populate('driver', 'name phone avatar')
    .sort({ createdAt: -1 });
};

exports.updateBookingStatus = async (bookingId, status) => {
  const booking = await Booking.findByIdAndUpdate(
    bookingId,
    { status, expiresAt: null },
    { new: true }
  )
  .populate('driver', 'name phone avatar')
  .populate('customer', 'name phone avatar');
  return booking;
};

exports.rejectDriverOffer = async (bookingId, customerId, driverId) => {
  const booking = await Booking.findById(bookingId);

  if (!booking || booking.customer.toString() !== customerId.toString()) {
    const error = new Error('Unauthorized or booking not found');
    error.statusCode = 403;
    throw error;
  }

  const offerIndex = booking.offers.findIndex(o => o.driver.toString() === driverId.toString());
  if (offerIndex >= 0) {
    booking.offers[offerIndex].status = 'rejected';
    await booking.save();
  }

  return await Booking.findById(bookingId)
    .populate('offers.driver', 'name phone avatar rating')
    .populate('customer', 'name phone avatar');
};