const bookingService = require('../services/bookingService');

exports.createBooking = async (req, res) => {
  try {
    const customerId = req.user.id;
    const booking = await bookingService.createBooking(customerId, req.body);

    const io = req.app.get('io');
    io.emit('new_booking_request', booking); // Notify all drivers

    res.status(201).json(booking);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getAvailableBookings = async (req, res) => {
  try {
    const bookings = await bookingService.getAvailableBookings();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.makeDriverOffer = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { fare } = req.body;
    
    const booking = await bookingService.makeDriverOffer(req.params.id, driverId, fare);

    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const customerSocketId = connectedUsers.get(booking.customer._id.toString());
    
    // Notify the specific customer that a driver made a new offer
    if (customerSocketId) {
      io.to(customerSocketId).emit('new_driver_offer', booking);
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.acceptDriverOffer = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { driverId } = req.body; 
    
    const booking = await bookingService.acceptDriverOffer(req.params.id, customerId, driverId);

    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const driverSocketId = connectedUsers.get(driverId.toString());
    
    // Notify the chosen driver that they won the ride
    if (driverSocketId) {
      io.to(driverSocketId).emit('offer_accepted', booking);
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getBookingStatus = async (req, res) => {
  try {
    const booking = await bookingService.getBookingStatus(req.params.id);
    res.status(200).json(booking);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const booking = await bookingService.updateBookingStatus(req.params.id, req.body.status);

    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const customerSocketId = connectedUsers.get(booking.customer._id.toString());
    
    // Update customer when driver arrives, starts, or completes trip
    if (customerSocketId) {
      io.to(customerSocketId).emit('booking_status_updated', booking);
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};