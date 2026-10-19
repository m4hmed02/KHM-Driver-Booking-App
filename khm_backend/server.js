require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const bookingService = require('./src/services/bookingService');

connectDB();

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const connectedUsers = new Map(); // userId string -> socketId

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  // ── Auth registration ────────────────────────────────────────────────────────
  socket.on('register', (userId) => {
    if (!userId) return;
    const strUserId = typeof userId === 'object' && userId._id ? userId._id.toString() : userId.toString();
    connectedUsers.set(strUserId, socket.id);
    socket.userId = strUserId;
    console.log(`👤 User ${strUserId} registered with socket ${socket.id}`);
  });

  // ── Join Booking Room ────────────────────────────────────────────────────────
  socket.on('join_booking', (bookingId) => {
    if (!bookingId) return;
    const room = `booking_${bookingId.toString()}`;
    socket.join(room);
    console.log(`🚪 Socket ${socket.id} joined room ${room}`);
  });

  // ── Driver real-time location updates ────────────────────────────────────────
  socket.on('driver_location_update', async (data) => {
    try {
      const { bookingId, latitude, longitude, customerId } = data;
      if (!bookingId || latitude == null || longitude == null) return;

      if (customerId) {
        const customerSocketId = connectedUsers.get(customerId.toString());
        if (customerSocketId) {
          io.to(customerSocketId).emit('driver_location_update', { bookingId, latitude, longitude });
        }
      }
    } catch (err) {
      console.error('[Socket] driver_location_update error:', err.message);
    }
  });

  // ── Customer "I'm Coming" acknowledgement ────────────────────────────────────
  socket.on('customer_coming', (data) => {
    try {
      const { bookingId, driverId } = data;
      if (!driverId || !bookingId) return;
      const driverSocketId = connectedUsers.get(driverId.toString());
      if (driverSocketId) {
        io.to(driverSocketId).emit('customer_coming', { bookingId });
      }
    } catch (err) {
      console.error('[Socket] customer_coming error:', err.message);
    }
  });

  // ── In-ride Chat ─────────────────────────────────────────────────────────────
  // Either party emits: { bookingId, recipientId, senderId, senderName, text, timestamp }
  socket.on('chat_message', async (data) => {
    try {
      const { bookingId, recipientId, senderId, senderName, text, timestamp } = data;
      if (!bookingId || !text) return;

      const safeBookingId = bookingId.toString();
      const safeSenderId = senderId ? (typeof senderId === 'object' ? senderId._id?.toString() || '' : senderId.toString()) : '';
      const safeRecipientId = recipientId ? (typeof recipientId === 'object' ? recipientId._id?.toString() || '' : recipientId.toString()) : '';
      const safeTimestamp = timestamp || Date.now();

      const messagePayload = {
        bookingId: safeBookingId,
        senderId: safeSenderId,
        senderName: senderName || 'User',
        text,
        timestamp: safeTimestamp,
      };

      // Ensure sender is registered in connectedUsers
      if (safeSenderId) {
        connectedUsers.set(safeSenderId, socket.id);
        socket.userId = safeSenderId;
      }

      console.log(`💬 [Chat] [${safeBookingId}] ${messagePayload.senderName} (${safeSenderId}) -> ${safeRecipientId}: "${text}"`);

      // 1. Persist message in MongoDB so history is never lost
      try {
        await bookingService.addBookingMessage(safeBookingId, messagePayload);
      } catch (dbErr) {
        console.warn('[Socket] Could not persist message to MongoDB:', dbErr.message);
      }

      // 2. Broadcast to room (both parties joined to this booking)
      const room = `booking_${safeBookingId}`;
      socket.to(room).emit('chat_message', messagePayload);

      // 3. Direct delivery to recipient's socket if connected
      if (safeRecipientId) {
        const recipientSocketId = connectedUsers.get(safeRecipientId);
        if (recipientSocketId && recipientSocketId !== socket.id) {
          io.to(recipientSocketId).emit('chat_message', messagePayload);
          console.log(`   -> Delivered directly to recipient socket ${recipientSocketId}`);
        } else if (!recipientSocketId) {
          console.log(`   ⚠️ Recipient ${safeRecipientId} not currently in connectedUsers (stored in DB & broadcast to room)`);
        }
      }
    } catch (err) {
      console.error('[Socket] chat_message error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
    console.log('🔌 Socket disconnected:', socket.id);
  });
});

app.set('io', io);
app.set('connectedUsers', connectedUsers);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});