const bookingService = require('../services/bookingService');

exports.createBooking = async (req, res) => {
  try {
    const customerId = req.user.id;
    const booking = await bookingService.createBooking(customerId, req.body);

    const io = req.app.get('io');
    // Emit to all drivers — they will filter by bookingType on their end.
    io.emit('new_booking_request', booking);

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

exports.getScheduledBookings = async (req, res) => {
  try {
    const bookings = await bookingService.getScheduledBookings();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.acceptScheduledBooking = async (req, res) => {
  try {
    const driverId = req.user.id;
    const booking = await bookingService.acceptScheduledBooking(req.params.id, driverId);

    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');

    // Notify the customer their scheduled ride has been accepted
    const customerId = booking.customer._id
      ? booking.customer._id.toString()
      : booking.customer.toString();
    const customerSocketId = connectedUsers.get(customerId);
    if (customerSocketId) {
      io.to(customerSocketId).emit('booking_status_updated', {
        ...booking.toObject(),
        customerId,
      });
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
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

exports.getMyBookings = async (req, res) => {
  try {
    const customerId = req.user.id;
    const bookings = await bookingService.getMyBookings(customerId);
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    await bookingService.deleteBooking(req.params.id, req.user.id);
    res.status(204).end();
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const booking = await bookingService.updateBookingStatus(req.params.id, req.body.status);

    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');

    // Build a payload that includes customerId so the driver app can
    // use it for forwarding location events.
    const payload = {
      ...booking.toObject ? booking.toObject() : booking,
      customerId: booking.customer._id ? booking.customer._id.toString() : booking.customer.toString(),
    };

    const customerSocketId = connectedUsers.get(payload.customerId);
    // Update customer when driver arrives, starts, or completes trip
    if (customerSocketId) {
      io.to(customerSocketId).emit('booking_status_updated', payload);
    }

    // If the ride is completed, also notify the driver socket (same one calling,
    // but this keeps both sides consistent)
    const driverId = booking.driver?._id ? booking.driver._id.toString() : (booking.driver ? booking.driver.toString() : null);
    if (driverId) {
      const driverSocketId = connectedUsers.get(driverId);
      if (driverSocketId && req.body.status === 'completed') {
        io.to(driverSocketId).emit('booking_status_updated', payload);
      }
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reject a driver's offer — customer declines
exports.rejectDriverOffer = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { driverId } = req.body;

    const booking = await bookingService.rejectDriverOffer(req.params.id, customerId, driverId);

    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const driverSocketId = connectedUsers.get(driverId.toString());

    if (driverSocketId) {
      io.to(driverSocketId).emit('offer_rejected', {
        bookingId: req.params.id,
        driverId,
      });
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};