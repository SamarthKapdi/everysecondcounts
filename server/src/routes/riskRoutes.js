const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMyRisk, getPatientRisk } = require('../controllers/riskController');

router.get('/me', protect, getMyRisk);
router.get('/patient/:id', protect, getPatientRisk);

module.exports = router;
