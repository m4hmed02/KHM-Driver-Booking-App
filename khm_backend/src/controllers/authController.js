const authService = require('../services/authService');

exports.registerUser = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    // if image uploaded than, save the path
    const avatarPath = req.file ? `/uploads/avatars/${req.file.filename}` : '';

    const result = await authService.registerUser({ name, phone, email, password, avatarPath });
    res.status(201).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const result = await authService.loginUser({ phone, password });
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};