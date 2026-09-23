const express = require('express');
const router = express.Router();
const transplantController = require('../controllers/transplantController');
const { protect, restrictTo, ROLES } = require('../middleware/auth');

// ── Donor Routes ──
router.post('/donors', protect, transplantController.registerDonor);
router.get('/donors', protect, restrictTo(ROLES.DOCTOR, ROLES.HOSPITAL_STAFF, ROLES.SUPER_ADMIN), transplantController.getDonors);

// ── Waitlist Routes ──
router.post('/waitlist', protect, restrictTo(ROLES.DOCTOR, ROLES.HOSPITAL_STAFF), transplantController.addWaitlist);
router.get('/waitlist', protect, restrictTo(ROLES.DOCTOR, ROLES.HOSPITAL_STAFF, ROLES.SUPER_ADMIN), transplantController.getWaitlist);

// ── Matching Routes ──
router.get('/waitlist/:id/matches', protect, restrictTo(ROLES.DOCTOR, ROLES.HOSPITAL_STAFF, ROLES.SUPER_ADMIN), transplantController.findMatchesForWaitlist);
router.post('/match', protect, restrictTo(ROLES.DOCTOR, ROLES.HOSPITAL_STAFF, ROLES.SUPER_ADMIN), transplantController.matchOrgan);

module.exports = router;
