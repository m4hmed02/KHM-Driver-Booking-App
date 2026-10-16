require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/db');

connectDB();

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const connectedUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // ── Auth registration ────────────────────────────────────────────────────────
  socket.on('register', (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  // ── Driver real-time location updates ────────────────────────────────────────
  // Driver app emits: { bookingId, latitude, longitude }
  // We forward to the customer of that booking
  socket.on('driver_location_update', async (data) => {
    try {
      const { bookingId, latitude, longitude, customerId } = data;
      if (!bookingId || latitude == null || longitude == null) return;

      // If customerId is provided directly, use it; otherwise look up the booking
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
  // Customer emits: { bookingId, driverId }
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
  // We forward the full payload to the recipient.
  socket.on('chat_message', (data) => {
    try {
      const { recipientId, ...rest } = data;
      if (!recipientId) return;
      const recipientSocketId = connectedUsers.get(recipientId.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('chat_message', rest);
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
    console.log('User disconnected:', socket.id);
  });
});

app.set('io', io);
app.set('connectedUsers', connectedUsers);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});