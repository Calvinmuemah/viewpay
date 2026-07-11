const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { validateFields } = require('../middlewares/validationMiddleware');
const {
  validateUserRegister,
  validateAdvertiserRegister,
  validateLogin,
  validateOtpVerify,
  validateRequestReset,
  validateResetPassword
} = require('../validators/authValidator');

router.post('/register/user', validateUserRegister, validateFields, AuthController.registerUser);
router.post('/register/advertiser', validateAdvertiserRegister, validateFields, AuthController.registerAdvertiser);
router.post('/login', validateLogin, validateFields, AuthController.login);
router.post('/verify-otp', validateOtpVerify, validateFields, AuthController.verifyOtp);
router.post('/forgot-password', validateRequestReset, validateFields, AuthController.forgotPassword);
router.post('/reset-password', validateResetPassword, validateFields, AuthController.resetPassword);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', AuthController.logout);

module.exports = router;
