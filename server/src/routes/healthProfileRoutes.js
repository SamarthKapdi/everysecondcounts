const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getProfile, updateProfile } = require('../controllers/healthProfileController');

/**
 * Health check endpoint: GET /api/health
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Every Second Counts API is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * Health Profile endpoints: GET/PUT /api/health/profile
 * Gated by authentication and active clinical relationship verification.
 */
router.route('/profile')
  .get(protect, getProfile)
  .put(protect, updateProfile);

module.exports = router;
