const express = require('express');
const router = express.Router();
const ambulanceController = require('../controllers/ambulanceController');

// GET /api/ambulances - Get list of all ambulances
router.get('/', ambulanceController.getAllAmbulances);

module.exports = router;
