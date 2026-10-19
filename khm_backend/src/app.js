const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Global Request Logger ───────────────────────────────────────────────────
app.use((req, res, next) => {
  const time = new Date().toLocaleTimeString();
  console.log(`\n📡 [${time}] ${req.method} ${req.originalUrl}`);
  if (req.body && Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '******';
    console.log('   Payload:', JSON.stringify(safeBody));
  }
  next();
});

app.get('/', (req, res) => {
  res.send('KHM Backend API is running...');
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/fares', require('./routes/fareRoutes'));

module.exports = app;