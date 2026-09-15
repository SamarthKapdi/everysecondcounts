const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const { protect, restrictTo, ROLES } = require('../middleware/auth');

router.get('/', hospitalController.getHospitals);
router.get('/:id', hospitalController.getHospital);
router.post('/recommend', protect, hospitalController.recommendHospital);
router.put('/:id/resources', protect, restrictTo(ROLES.HOSPITAL_STAFF, ROLES.SUPER_ADMIN), hospitalController.updateResources);

module.exports = router;
