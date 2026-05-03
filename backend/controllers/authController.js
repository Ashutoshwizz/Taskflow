const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user
  });
};

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    // Only allow admin role if explicitly set (first user becomes admin)
    const userCount = await User.countDocuments();
    const assignedRole = userCount === 0 ? 'admin' : (role === 'admin' ? 'admin' : 'member');

    const user = await User.create({ name, email, password, role: assignedRole });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

// @desc    Update profile
// @route   PUT /api/auth/me
// @access  Private
exports.updateMe = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, avatar },
      { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};
