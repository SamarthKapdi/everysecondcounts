const express = require('express');
const router = express.Router();
const insuranceController = require('../controllers/insuranceController');
const { protect, restrictTo, ROLES } = require('../middleware/auth');

// ── Policy Routes ──
// Anyone can get policies for themselves; staff/admin can get for anyone
router.post('/policies', protect, insuranceController.createPolicy);
router.get('/policies/patient/:patientId', protect, insuranceController.getPatientPolicies);
router.get('/policies/me', protect, restrictTo(ROLES.PATIENT), insuranceController.getPatientPolicies);

// ── Claim Routes ──
router.post('/claims', protect, insuranceController.submitClaim);
router.get('/claims', protect, insuranceController.getClaims);
router.get('/claims/:id', protect, insuranceController.getClaim);
router.patch('/claims/:id/status', protect, restrictTo(ROLES.SUPER_ADMIN, ROLES.HOSPITAL_STAFF), insuranceController.updateClaimStatus);

module.exports = router;
