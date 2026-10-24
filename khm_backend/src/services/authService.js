const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const otpService = require('./otpService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'khm_secret_key_123', { expiresIn: '30d' });
};

/**
 * Generates all common format variants of a phone number so users can login
 * regardless of whether they typed +971, +92, 050, 0300, local digits, spaces, etc.
 */
const getPhoneVariants = (phone) => {
  if (!phone) return [];
  const raw = phone.toString().trim();
  const cleaned = raw.replace(/[\s\-()]/g, '');
  const digitsOnly = cleaned.replace(/\D/g, '');

  const variants = new Set([
    raw,
    cleaned,
    digitsOnly,
    '+' + digitsOnly,
  ]);

  // Pakistan (+92) handling: 10 local digits typically starting with 3
  if (digitsOnly.startsWith('92') && digitsOnly.length >= 11) {
    const pkLocal = digitsOnly.slice(2).replace(/^0+/, '');
    variants.add('+92' + pkLocal);
    variants.add('92' + pkLocal);
    variants.add('0' + pkLocal);
    variants.add(pkLocal);
  } else if (digitsOnly.startsWith('03') && digitsOnly.length === 11) {
    const pkLocal = digitsOnly.slice(1);
    variants.add('+92' + pkLocal);
    variants.add('92' + pkLocal);
    variants.add('0' + pkLocal);
    variants.add(pkLocal);
  } else if (digitsOnly.startsWith('3') && digitsOnly.length === 10) {
    const pkLocal = digitsOnly;
    variants.add('+92' + pkLocal);
    variants.add('92' + pkLocal);
    variants.add('0' + pkLocal);
    variants.add(pkLocal);
  }

  // UAE (+971) handling: 9 local digits typically starting with 5
  if (digitsOnly.startsWith('971') && digitsOnly.length >= 10) {
    const uaeLocal = digitsOnly.slice(3).replace(/^0+/, '');
    variants.add('+971' + uaeLocal);
    variants.add('971' + uaeLocal);
    variants.add('0' + uaeLocal);
    variants.add(uaeLocal);
  } else if (digitsOnly.startsWith('05') && digitsOnly.length === 10) {
    const uaeLocal = digitsOnly.slice(1);
    variants.add('+971' + uaeLocal);
    variants.add('971' + uaeLocal);
    variants.add('0' + uaeLocal);
    variants.add(uaeLocal);
  } else if (digitsOnly.startsWith('5') && digitsOnly.length === 9) {
    const uaeLocal = digitsOnly;
    variants.add('+971' + uaeLocal);
    variants.add('971' + uaeLocal);
    variants.add('0' + uaeLocal);
    variants.add(uaeLocal);
  }

  // Fallback suffixes
  if (digitsOnly.length >= 9) {
    const last9 = digitsOnly.slice(-9);
    variants.add(last9);
    variants.add('0' + last9);
    variants.add('+971' + last9);
  }
  if (digitsOnly.length >= 10) {
    const last10 = digitsOnly.slice(-10);
    variants.add(last10);
    variants.add('0' + last10);
    variants.add('+92' + last10);
  }

  return Array.from(variants).filter(Boolean);
};

/**
 * Flexible phone finder matching all variations
 */
const findUserByPhone = async (phone) => {
  if (!phone) return null;
  const variants = getPhoneVariants(phone);
  return await User.findOne({ phone: { $in: variants } });
};

/**
 * Step 1 of Login: Always generates an OTP and prints it in the terminal console!
 */
exports.loginUser = async ({ phone, password }) => {
  console.log('\n' + '─'.repeat(50));
  console.log(`📥 [AUTH LOGIN] Login request received:`);
  console.log(`   📱 Phone input   : "${phone}"`);
  console.log(`   🔑 Password given: ${password ? 'YES (' + password.length + ' chars)' : 'NO'}`);

  if (!phone || !password) {
    console.log('   ❌ Error: Phone or password missing in request body');
    const error = new Error('Please enter both phone number and password');
    error.statusCode = 400;
    throw error;
  }

  const user = await findUserByPhone(phone);
  const cleanPhone = otpService.normalizePhone(phone);

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  if (user) {
    console.log(`   👤 Found existing user: "${user.name}" (Role: ${user.role}, DB Phone: ${user.phone})`);
    
    // Check password for logging purposes
    const isMatch = await bcrypt.compare(password, user.password).catch(() => false);
    if (isMatch) {
      console.log(`   ✅ Password verified against database`);
    } else {
      console.log(`   ℹ️ Password differs from stored hash. It will be updated upon OTP verification.`);
    }

    // Generate OTP for this user and print to terminal
    await otpService.createAndSendOtp(user.phone, 'login', user.name, {
      pendingPassword: hashedPassword,
      role: user.role,
    });

    console.log(`   🚀 OTP successfully generated and printed to terminal for ${user.phone}`);
    console.log('─'.repeat(50) + '\n');

    return {
      otpRequired: true,
      phone: user.phone,
      message: 'OTP has been generated. Please check your backend terminal.',
    };
  } else {
    // New phone number: generate OTP and will auto-create user on OTP verification
    console.log(`   ℹ️ No existing user found for phone "${cleanPhone}". Generating OTP and will auto-create on verification.`);

    await otpService.createAndSendOtp(cleanPhone, 'login', 'New User', {
      pendingPassword: hashedPassword,
      role: 'customer',
    });

    console.log(`   🚀 OTP successfully generated and printed to terminal for ${cleanPhone}`);
    console.log('─'.repeat(50) + '\n');

    return {
      otpRequired: true,
      phone: cleanPhone,
      message: 'OTP has been generated. Please check your backend terminal.',
    };
  }
};

/**
 * Step 2 of Login: verify OTP entered by user and return user object + JWT token
 */
exports.verifyLoginOtp = async ({ phone, otp }) => {
  console.log('\n' + '─'.repeat(50));
  console.log(`📥 [AUTH VERIFY] Login OTP verification request:`);
  console.log(`   📱 Phone: "${phone}"`);
  console.log(`   🔑 OTP  : "${otp}"`);

  if (!phone || !otp) {
    const error = new Error('Phone number and OTP code are required');
    error.statusCode = 400;
    throw error;
  }

  const cleanPhone = otpService.normalizePhone(phone);

  // Check and consume OTP
  const otpRecord = await otpService.verifyOtp(cleanPhone, otp, 'login');
  console.log(`   ✅ OTP verification succeeded for phone ${cleanPhone}`);

  let user = await findUserByPhone(phone);

  if (user) {
    // If pendingPassword was stored, update user's password
    if (otpRecord && otpRecord.pendingPassword) {
      user.password = otpRecord.pendingPassword;
      await user.save();
      console.log(`   🔒 Updated password for user ${user.name}`);
    }
  } else {
    // Auto-create user
    const salt = await bcrypt.genSalt(10);
    const defaultPassword = otpRecord?.pendingPassword || (await bcrypt.hash('123456', salt));

    user = await User.create({
      name: 'User ' + cleanPhone.slice(-4),
      phone: cleanPhone,
      password: defaultPassword,
      role: otpRecord?.role || 'customer',
    });
    console.log(`   🎉 Auto-created user for phone ${cleanPhone}`);
  }

  console.log(`   ✨ Issuing JWT session token for ${user.name}`);
  console.log('─'.repeat(50) + '\n');

  return {
    _id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email || '',
    avatar: user.avatar || '',
    role: user.role || 'customer',
    token: generateToken(user._id),
  };
};

/**
 * Step 1 of Register: check uniqueness, generate & print OTP to terminal
 */
exports.sendRegisterOtp = async ({ phone, email }) => {
  console.log('\n' + '─'.repeat(50));
  console.log(`📥 [AUTH REGISTER OTP] Request to send registration OTP:`);
  console.log(`   📱 Phone: "${phone}"`);
  console.log(`   📧 Email: "${email || 'none'}"`);

  if (!phone) {
    const error = new Error('Phone number is required');
    error.statusCode = 400;
    throw error;
  }

  const cleanPhone = otpService.normalizePhone(phone);

  const existingPhone = await findUserByPhone(phone);
  if (existingPhone) {
    console.log(`   ⚠️ Notice: Phone number already exists for user "${existingPhone.name}".`);
    // Still generate OTP so the user can verify their phone
  }

  if (email && email.trim()) {
    const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail && (!existingPhone || existingEmail._id.toString() !== existingPhone._id.toString())) {
      console.log(`   ⚠️ Notice: Email already registered.`);
      const error = new Error('User with this email already exists');
      error.statusCode = 400;
      throw error;
    }
  }

  await otpService.createAndSendOtp(cleanPhone, 'register');
  console.log(`   🚀 Registration OTP sent to terminal for ${cleanPhone}`);
  console.log('─'.repeat(50) + '\n');

  return {
    success: true,
    phone: cleanPhone,
    message: 'Registration OTP has been generated. Please check your backend terminal.',
  };
};

/**
 * Verifies register OTP without consuming it (for multi-step forms like driver signup)
 */
exports.verifyRegisterOtp = async ({ phone, otp }) => {
  console.log(`📥 [AUTH REGISTER] Verifying registration OTP: phone="${phone}", otp="${otp}"`);
  const cleanPhone = otpService.normalizePhone(phone);
  await otpService.checkOtpWithoutConsuming(cleanPhone, otp, 'register');
  console.log(`✅ [AUTH REGISTER] Registration OTP is valid for ${cleanPhone}`);

  return {
    success: true,
    message: 'OTP verified successfully.',
  };
};

/**
 * Step 2 of Register: verify OTP and create account
 */
exports.registerUser = async ({ name, phone, email, password, role, otp, avatarPath }) => {
  console.log('\n' + '─'.repeat(50));
  console.log(`📥 [AUTH REGISTER] Completing registration:`);
  console.log(`   👤 Name : "${name}"`);
  console.log(`   📱 Phone: "${phone}"`);
  console.log(`   🎭 Role : "${role || 'customer'}"`);

  if (!phone || !password || !name) {
    const error = new Error('Name, phone number, and password are required');
    error.statusCode = 400;
    throw error;
  }

  const cleanPhone = otpService.normalizePhone(phone);

  // If OTP is provided, verify and consume it
  if (otp) {
    await otpService.verifyOtp(cleanPhone, otp, 'register');
    console.log(`   ✅ Registration OTP verified and consumed`);
  } else {
    const error = new Error('OTP verification is required for registration');
    error.statusCode = 400;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  let user = await findUserByPhone(cleanPhone);
  if (user) {
    // Update existing user
    user.name = name.trim();
    user.password = hashedPassword;
    if (email && email.trim()) user.email = email.trim().toLowerCase();
    if (role) user.role = role === 'driver' ? 'driver' : 'customer';
    if (avatarPath) user.avatar = avatarPath;
    await user.save();
    console.log(`   🔄 Updated existing user ${user.name}`);
  } else {
    user = await User.create({
      name: name.trim(),
      phone: cleanPhone,
      email: email && email.trim() ? email.trim().toLowerCase() : undefined,
      password: hashedPassword,
      role: role === 'driver' ? 'driver' : 'customer',
      avatar: avatarPath || '',
    });
    console.log(`   🎉 Created new user ${user.name}`);
  }

  console.log(`   ✨ Issuing session token for ${user.name}`);
  console.log('─'.repeat(50) + '\n');

  return {
    _id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    token: generateToken(user._id),
  };
};

/**
 * Resend OTP for either Login or Register
 */
exports.resendOtp = async ({ phone, purpose }) => {
  console.log(`📥 [AUTH RESEND] Resending OTP for phone: "${phone}", purpose: "${purpose}"`);
  if (!phone || !purpose) {
    const error = new Error('Phone number and purpose (login/register) are required');
    error.statusCode = 400;
    throw error;
  }

  const cleanPhone = otpService.normalizePhone(phone);
  await otpService.createAndSendOtp(cleanPhone, purpose);

  return {
    success: true,
    message: 'A new OTP has been printed to the backend terminal.',
  };
};