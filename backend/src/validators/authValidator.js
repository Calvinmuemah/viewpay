const { body } = require('express-validator');

const validateUserRegister = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').trim().isEmail().withMessage('Provide a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('referralCode').optional().trim(),
];

const validateAdvertiserRegister = [
  body('companyName').trim().notEmpty().withMessage('Company name is required').isLength({ min: 2, max: 100 }).withMessage('Company name must be between 2 and 100 characters'),
  body('contactName').trim().notEmpty().withMessage('Contact name is required').isLength({ min: 2, max: 100 }).withMessage('Contact name must be between 2 and 100 characters'),
  body('email').trim().isEmail().withMessage('Provide a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('Provide a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const validateOtpVerify = [
  body('email').trim().isEmail().withMessage('Provide a valid email address').normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 }).withMessage('OTP code must be 6 digits').isNumeric().withMessage('OTP must be numeric'),
  body('purpose').isIn(['verify_email', 'reset_password']).withMessage('Invalid purpose value'),
];

const validateRequestReset = [
  body('email').trim().isEmail().withMessage('Provide a valid email address').normalizeEmail(),
];

const validateResetPassword = [
  body('email').trim().isEmail().withMessage('Provide a valid email address').normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 }).withMessage('OTP code must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
];

module.exports = {
  validateUserRegister,
  validateAdvertiserRegister,
  validateLogin,
  validateOtpVerify,
  validateRequestReset,
  validateResetPassword
};
