const express = require('express');
const router = express.Router();
const admissionController = require('../controllers/admissionController');
const { protect, restrictTo, ROLES } = require('../middleware/auth');

// Create admission from emergency case
router.post('/', protect, restrictTo(ROLES.HOSPITAL_STAFF, ROLES.DOCTOR, ROLES.SUPER_ADMIN), admissionController.createAdmission);

// Get all admissions (filtered by role)
router.get('/', protect, admissionController.getAdmissions);

// Get single admission
router.get('/:id', protect, admissionController.getAdmission);

// Update admission stage (forward-only transitions)
router.patch('/:id/stage', protect, restrictTo(ROLES.HOSPITAL_STAFF, ROLES.DOCTOR, ROLES.SUPER_ADMIN), admissionController.updateStage);

// Update billing
router.patch('/:id/billing', protect, restrictTo(ROLES.HOSPITAL_STAFF, ROLES.SUPER_ADMIN), admissionController.updateBilling);

// Discharge patient
router.patch('/:id/discharge', protect, restrictTo(ROLES.DOCTOR, ROLES.SUPER_ADMIN), admissionController.dischargePatient);

module.exports = router;
