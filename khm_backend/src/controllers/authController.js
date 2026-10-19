const authService = require('../services/authService');

exports.loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const result = await authService.loginUser({ phone, password });
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.verifyLoginOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const result = await authService.verifyLoginOtp({ phone, otp });
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.sendRegisterOtp = async (req, res) => {
  try {
    const { phone, email } = req.body;
    const result = await authService.sendRegisterOtp({ phone, email });
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.verifyRegisterOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const result = await authService.verifyRegisterOtp({ phone, otp });
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.registerUser = async (req, res) => {
  try {
    const { name, phone, email, password, role, otp } = req.body;

    // If image uploaded then save path
    const avatarPath = req.file ? `/uploads/avatars/${req.file.filename}` : '';

    const result = await authService.registerUser({
      name,
      phone,
      email,
      password,
      role,
      otp,
      avatarPath,
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    const result = await authService.resendOtp({ phone, purpose });
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};