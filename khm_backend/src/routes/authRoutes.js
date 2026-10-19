const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  verifyLoginOtp,
  sendRegisterOtp,
  verifyRegisterOtp,
  resendOtp,
} = require('../controllers/authController');
const upload = require('../middleware/upload');

// Registration routes
router.post('/send-register-otp', sendRegisterOtp);
router.post('/verify-register-otp', verifyRegisterOtp);
router.post('/register', upload.single('avatar'), registerUser);

// Login routes
router.post('/login', loginUser);
router.post('/verify-login-otp', verifyLoginOtp);

// Resend OTP
router.post('/resend-otp', resendOtp);

module.exports = router;