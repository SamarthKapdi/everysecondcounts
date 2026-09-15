const express = require('express');
const router = express.Router();
const prisma = require('../config/prismaClient');
const { protect } = require('../middleware/auth');

// Create a new consultation request (patient → doctor)
router.post('/', protect, async (req, res, next) => {
  try {
    const { consultationId, doctorId, query } = req.body;
    const patientId = req.user.id;
    const patientName = req.user.name || 'Patient';

    const consultation = await prisma.consultation.create({
      data: {
        id: consultationId,
        patientId,
        doctorId: doctorId || null,
        patientName,
        query: query || 'General consultation',
        status: 'PENDING',
      },
    });

    res.status(201).json({
      status: 'success',
      data: { consultation },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const existing = await prisma.consultation.findUnique({
        where: { id: req.body.consultationId },
      });
      return res.json({ status: 'success', data: { consultation: existing } });
    }
    next(error);
  }
});

// Get consultations for a doctor (all PENDING + their ACTIVE ones)
router.get('/doctor', protect, async (req, res, next) => {
  try {
    const doctorId = req.user.id;

    const consultations = await prisma.consultation.findMany({
      where: {
        OR: [
          {
            status: 'PENDING',
            OR: [
              { doctorId: doctorId },
              { doctorId: null },
            ],
          },
          {
            status: 'ACTIVE',
            doctorId: doctorId,
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      status: 'success',
      data: { consultations },
    });
  } catch (error) {
    next(error);
  }
});

// Get consultations for a patient
router.get('/patient', protect, async (req, res, next) => {
  try {
    const consultations = await prisma.consultation.findMany({
      where: { patientId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      status: 'success',
      data: { consultations },
    });
  } catch (error) {
    next(error);
  }
});

// Accept a consultation (doctor)
router.patch('/:id/accept', protect, async (req, res, next) => {
  try {
    const consultation = await prisma.consultation.update({
      where: { id: req.params.id },
      data: {
        status: 'ACTIVE',
        doctorId: req.user.id,
        doctorName: req.user.name || 'Doctor',
      },
    });

    res.json({
      status: 'success',
      data: { consultation },
    });
  } catch (error) {
    next(error);
  }
});

// End a consultation
router.patch('/:id/end', protect, async (req, res, next) => {
  try {
    const consultation = await prisma.consultation.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' },
    });

    res.json({
      status: 'success',
      data: { consultation },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
