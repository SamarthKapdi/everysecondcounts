const express = require('express');
const router = express.Router();
const labController = require('../controllers/labController');
const { protect, restrictTo, ROLES } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for PDF uploads
const upload = multer({ 
  dest: 'uploads/labs/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Create a new test order
router.post('/orders', protect, restrictTo(ROLES.DOCTOR, ROLES.HOSPITAL_STAFF), labController.orderTest);

// Get all test orders (filtered)
router.get('/orders', protect, labController.getOrders);

// Update test order status
router.patch('/orders/:id/status', protect, restrictTo(ROLES.HOSPITAL_STAFF, ROLES.SUPER_ADMIN), labController.updateTestStatus);

// Upload result for a test order
router.post('/orders/:id/result', protect, restrictTo(ROLES.HOSPITAL_STAFF, ROLES.SUPER_ADMIN), upload.single('report'), labController.uploadResult);

// Mark result as reviewed by doctor
router.patch('/results/:resultId/review', protect, restrictTo(ROLES.DOCTOR, ROLES.SUPER_ADMIN), labController.markReviewed);

module.exports = router;
