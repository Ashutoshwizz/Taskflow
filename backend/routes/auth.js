const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { signup, login, getMe, updateMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate
], signup);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], login);

router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

module.exports = router;
