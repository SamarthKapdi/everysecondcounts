const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.get('/me', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);
router.get('/doctors', protect, authController.getDoctors);

module.exports = router;
