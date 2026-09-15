const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { protect, restrictTo } = require('../middleware/auth');

router.post('/analyze', emergencyController.analyzeOnly);
router.post('/', protect, emergencyController.createEmergency);
router.get('/', protect, emergencyController.getEmergencies);
router.get('/:id', protect, emergencyController.getEmergency);
router.put('/:id', protect, restrictTo('SUPER_ADMIN', 'DOCTOR', 'HOSPITAL_STAFF'), emergencyController.updateEmergency);

module.exports = router;
