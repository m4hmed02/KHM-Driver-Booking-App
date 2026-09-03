const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.registerUser = async ({ name, phone, email, password, avatarPath }) => {
  const userExists = await User.findOne({ phone });
  if (userExists) {
    const error = new Error('User with this phone number already exists');
    error.statusCode = 400;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    phone,
    email: email || undefined, // empty string na ho, warna sparse unique tootega
    password: hashedPassword,
    avatar: avatarPath || '',
  });

  return {
    _id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    avatar: user.avatar,
    token: generateToken(user._id),
  };
};

exports.loginUser = async ({ phone, password }) => {
  const user = await User.findOne({ phone });
  if (!user) {
    const error = new Error('Invalid phone number or password');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error('Invalid phone number or password');
    error.statusCode = 401;
    throw error;
  }

  return {
    _id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    avatar: user.avatar,
    token: generateToken(user._id),
  };
};