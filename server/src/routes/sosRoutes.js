const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const { protect } = require('../middleware/auth');

router.post('/trigger', protect, sosController.triggerSOS);
router.get('/status', protect, sosController.getSOSStatus);

module.exports = router;
