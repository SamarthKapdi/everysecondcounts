const express = require('express');
const router = express.Router();
const fundraisingController = require('../controllers/fundraisingController');
const { protect, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/campaigns', fundraisingController.getCampaigns);
router.get('/campaigns/:id', fundraisingController.getCampaign);

// Contributions (Optional Auth allows anonymous users or logged in users)
// Note: Optional Auth middleware is not standard in this project, so we'll just allow unauthenticated posts
// and manually check req.headers.authorization in a real app. For this demo, let's just make it public.
router.post('/campaigns/:id/contribute', fundraisingController.contribute);

// Protected routes (Only logged in users can create a campaign)
router.post('/campaigns', protect, fundraisingController.createCampaign);

module.exports = router;
