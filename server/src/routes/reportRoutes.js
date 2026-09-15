const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.get('/', protect, reportController.getReports);
router.post('/', protect, reportController.createReport);
router.get('/history', protect, reportController.getMedicalHistory);
router.get('/history/:patientId', protect, reportController.getMedicalHistory);
router.post('/analyze', protect, upload.single('report'), reportController.analyzeReport);

module.exports = router;
