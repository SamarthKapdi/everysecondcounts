const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/stats', protect, dashboardController.getStats);
router.get('/trends', protect, dashboardController.getTrends);
router.get('/occupancy', protect, dashboardController.getOccupancy);
router.get('/severity-distribution', protect, dashboardController.getSeverityDistribution);

module.exports = router;
