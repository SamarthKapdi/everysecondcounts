const express = require('express');
const router = express.Router();
const ambulanceController = require('../controllers/ambulanceController');

router.get('/', ambulanceController.getAllAmbulances);

module.exports = router;
