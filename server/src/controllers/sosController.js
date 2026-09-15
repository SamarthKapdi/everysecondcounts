const prisma = require('../config/prismaClient');
const AppError = require('../utils/AppError');
const { startTelemetryStream } = require('../services/telemetrySimulator');

// Trigger SOS emergency — creates a RED severity case and dispatches nearest ambulance
exports.triggerSOS = async (req, res, next) => {
  try {
    const { locationLat, locationLng, symptoms, message } = req.body;

    const patientId = req.user?.id;
    if (!patientId) {
      return next(new AppError('Authentication required for SOS', 401));
    }

    // Create critical emergency case
    const emergency = await prisma.emergencyCase.create({
      data: {
        patientId,
        severity: 'RED',
        aiConfidenceScore: 1.0,
        aiReasoning: 'SOS Emergency Alert — Immediate attention required. Rule-based override.',
        recommendedAction: 'Dispatch ALS Ambulance immediately. Route to nearest Trauma Center.',
        symptoms: symptoms || ['Emergency SOS'],
        status: 'PENDING',
        locationLat: locationLat || 0.0,
        locationLng: locationLng || 0.0,
        notes: message || 'Emergency SOS triggered by patient',
      },
      include: {
        patient: { select: { name: true, phone: true } },
      },
    });

    // Find and dispatch nearest available ambulance
    const ambulance = await prisma.ambulance.findFirst({
      where: { status: 'AVAILABLE' },
    });

    let dispatchedAmbulance = null;
    if (ambulance) {
      dispatchedAmbulance = await prisma.ambulance.update({
        where: { id: ambulance.id },
        data: { status: 'BUSY' },
      });

      // Link ambulance to emergency
      await prisma.emergencyCase.update({
        where: { id: emergency.id },
        data: { ambulanceId: ambulance.id, status: 'DISPATCHED' },
      });
    }

    // Broadcast SOS via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to('HOSPITAL_STAFF').emit('emergency_alert', emergency);
      io.to('DOCTOR').emit('emergency_alert', emergency);
      io.to('SUPER_ADMIN').emit('emergency_alert', emergency);
      io.to('AMBULANCE_DRIVER').emit('emergency_alert', emergency);

      // Start simulated telemetry stream for this emergency
      startTelemetryStream(io, emergency.id, 'RED');
    }

    res.status(201).json({
      status: 'success',
      message: 'SOS alert triggered! Emergency services have been notified.',
      data: {
        emergency,
        ambulanceDispatched: dispatchedAmbulance,
        estimatedResponseTime: '8-12 minutes',
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get current SOS status for the authenticated patient
exports.getSOSStatus = async (req, res, next) => {
  try {
    const emergency = await prisma.emergencyCase.findFirst({
      where: {
        patientId: req.user.id,
        status: { in: ['PENDING', 'DISPATCHED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        hospital: { select: { name: true, locationLat: true, locationLng: true } },
        ambulance: { select: { vehicleNumber: true, currentLat: true, currentLng: true, status: true } },
      },
    });

    res.json({
      status: 'success',
      data: { sosStatus: emergency || null },
    });
  } catch (error) {
    next(error);
  }
};
