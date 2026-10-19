const Otp = require('../models/Otp');

/**
 * Normalizes phone numbers (removes spaces, dashes, etc.)
 */
const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.toString().trim().replace(/[\s\-()]/g, '');
};

/**
 * Generates a random 6-digit numeric OTP code
 */
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Prints the OTP to the backend terminal in a prominent, unmissable banner.
 */
const printOtpToTerminal = (phone, otp, purpose, userLabel = '') => {
  const purposeText = purpose ? purpose.toUpperCase() : 'AUTH';
  const timestamp = new Date().toLocaleTimeString();

  console.log('\n' + '╔' + '═'.repeat(66) + '╗');
  console.log(`║${' '.repeat(16)}🔐 KHM AUTHENTICATION OTP CODE 🔐${' '.repeat(16)}║`);
  console.log('╠' + '═'.repeat(66) + '╣');
  console.log(`║  ACTION       : ${purposeText} VERIFICATION`.padEnd(67) + '║');
  if (userLabel) {
    console.log(`║  USER / NAME  : ${userLabel}`.padEnd(67) + '║');
  }
  console.log(`║  PHONE NUMBER : ${phone}`.padEnd(67) + '║');
  console.log('║' + ' '.repeat(66) + '║');
  console.log(`║  🔑 OTP CODE  : >>>>>>   ${otp}   <<<<<<`.padEnd(67) + '║');
  console.log('║' + ' '.repeat(66) + '║');
  console.log(`║  VALIDITY     : 10 Minutes (Generated at ${timestamp})`.padEnd(67) + '║');
  console.log('║  INSTRUCTION  : Enter this 6-digit code in the app to proceed    ║');
  console.log('╚' + '═'.repeat(66) + '╝\n');
};

/**
 * Generates a new OTP, saves/replaces it in DB, and prints to terminal.
 */
const createAndSendOtp = async (phone, purpose, userLabel = '', extraData = {}) => {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) {
    const error = new Error('Valid phone number is required for OTP');
    error.statusCode = 400;
    throw error;
  }

  // Remove any previous active OTP for this phone & purpose
  await Otp.deleteMany({ phone: cleanPhone, purpose });

  const otp = generateOtp();

  await Otp.create({
    phone: cleanPhone,
    otp,
    purpose,
    pendingPassword: extraData.pendingPassword || '',
    role: extraData.role || 'customer',
  });

  // Print OTP to terminal console
  printOtpToTerminal(cleanPhone, otp, purpose, userLabel);

  return { phone: cleanPhone, otp };
};

/**
 * Verifies the OTP. If valid, deletes the OTP record.
 */
const verifyOtp = async (phone, inputOtp, purpose) => {
  const cleanPhone = normalizePhone(phone);
  const cleanOtp = (inputOtp || '').toString().trim();

  if (!cleanPhone || !cleanOtp) {
    const error = new Error('Phone number and OTP code are required');
    error.statusCode = 400;
    throw error;
  }

  const record = await Otp.findOne({ phone: cleanPhone, purpose }).sort({ createdAt: -1 });

  if (!record) {
    const error = new Error('OTP has expired or was not requested. Please request a new OTP.');
    error.statusCode = 400;
    throw error;
  }

  const tenMinutesInMs = 10 * 60 * 1000;
  if (Date.now() - new Date(record.createdAt).getTime() > tenMinutesInMs) {
    await Otp.deleteMany({ phone: cleanPhone, purpose });
    const error = new Error('OTP has expired. Please request a new OTP.');
    error.statusCode = 400;
    throw error;
  }

  if (record.otp !== cleanOtp) {
    const error = new Error('Invalid OTP code. Please check the terminal and try again.');
    error.statusCode = 400;
    throw error;
  }

  // Return record before deleting so callers can access pending data
  await Otp.deleteMany({ phone: cleanPhone, purpose });
  return record;
};

/**
 * Validates OTP without consuming it (useful for multi-step signup wizards)
 */
const checkOtpWithoutConsuming = async (phone, inputOtp, purpose) => {
  const cleanPhone = normalizePhone(phone);
  const cleanOtp = (inputOtp || '').toString().trim();

  if (!cleanPhone || !cleanOtp) {
    const error = new Error('Phone number and OTP code are required');
    error.statusCode = 400;
    throw error;
  }

  const record = await Otp.findOne({ phone: cleanPhone, purpose }).sort({ createdAt: -1 });

  if (!record) {
    const error = new Error('OTP has expired or was not requested. Please request a new OTP.');
    error.statusCode = 400;
    throw error;
  }

  const tenMinutesInMs = 10 * 60 * 1000;
  if (Date.now() - new Date(record.createdAt).getTime() > tenMinutesInMs) {
    await Otp.deleteMany({ phone: cleanPhone, purpose });
    const error = new Error('OTP has expired. Please request a new OTP.');
    error.statusCode = 400;
    throw error;
  }

  if (record.otp !== cleanOtp) {
    const error = new Error('Invalid OTP code. Please check the terminal and try again.');
    error.statusCode = 400;
    throw error;
  }

  return true;
};

module.exports = {
  normalizePhone,
  generateOtp,
  printOtpToTerminal,
  createAndSendOtp,
  verifyOtp,
  checkOtpWithoutConsuming,
};
