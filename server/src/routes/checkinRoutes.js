const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getTodayStatus, submitCheckin, getHistory } = require('../controllers/checkinController');

router.get('/today', protect, getTodayStatus);
router.post('/', protect, submitCheckin);
router.get('/history', protect, getHistory);

module.exports = router;
