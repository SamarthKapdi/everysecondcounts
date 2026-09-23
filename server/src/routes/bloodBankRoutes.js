const express = require('express');
const router = express.Router();
const bloodBankController = require('../controllers/bloodBankController');
const { protect, restrictTo, ROLES } = require('../middleware/auth');

// ── Inventory Routes ──
// Get inventory (public or restricted to staff depending on rules, let's restrict to staff/admin for updates)
router.get('/inventory', protect, bloodBankController.getInventory);
router.post('/inventory', protect, restrictTo(ROLES.HOSPITAL_STAFF, ROLES.SUPER_ADMIN), bloodBankController.updateInventory);

// ── Request Routes ──
router.get('/requests', protect, bloodBankController.getRequests);
router.post('/requests', protect, restrictTo(ROLES.DOCTOR, ROLES.HOSPITAL_STAFF), bloodBankController.requestBlood);

// Fulfill a matched request
router.post('/requests/:requestId/fulfill', protect, restrictTo(ROLES.HOSPITAL_STAFF, ROLES.SUPER_ADMIN), bloodBankController.fulfillRequest);

module.exports = router;
