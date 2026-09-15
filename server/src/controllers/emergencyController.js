const prisma = require('../config/prismaClient');
const { analyzeSymptoms } = require('../services/aiService');
const { rankHospitals } = require('../services/routingEngine');
const { stopTelemetryStream } = require('../services/telemetrySimulator');
const AppError = require('../utils/AppError');

// Create emergency case with AI analysis + Smart Hospital Routing
exports.createEmergency = async (req, res, next) => {
  try {
    const { symptoms, locationLat, locationLng, notes } = req.body;

    if (!symptoms || symptoms.length === 0) {
      return next(new AppError('Please provide at least one symptom', 400));
    }

    // Run Hybrid AI analysis
    const aiResult = await analyzeSymptoms(symptoms);

    // Smart Hospital Routing — multi-factor weighted scoring
    const allHospitals = await prisma.hospital.findMany({
      where: { isActive: true },
    });

    let selectedHospital = null;
    let routingResult = null;

    if (allHospitals.length > 0 && locationLat && locationLng) {
      routingResult = rankHospitals(allHospitals, {
        severity: aiResult.severity,
        symptoms,
        locationLat: parseFloat(locationLat),
        locationLng: parseFloat(locationLng),
      });
      selectedHospital = routingResult.recommended
        ? allHospitals.find(h => h.id === routingResult.recommended.hospitalId)
        : null;
    }

    // Fallback: if no location provided or routing failed, pick by bed availability
    if (!selectedHospital) {
      selectedHospital = await prisma.hospital.findFirst({
        where: { isActive: true, availableBeds: { gt: 0 } },
        orderBy: { availableBeds: 'desc' },
      });
    }
    
    const patientId = req.user?.id;
    if (!patientId) {
       return next(new AppError('User not authenticated properly', 401));
    }

    // Create the emergency case in Prisma
    const emergency = await prisma.emergencyCase.create({
      data: {
        patientId,
        hospitalId: selectedHospital ? selectedHospital.id : null,
        symptoms,
        severity: aiResult.severity,
        aiConfidenceScore: aiResult.confidenceScore,
        aiReasoning: aiResult.reasoning,
        recommendedAction: aiResult.recommendedAction,
        locationLat: locationLat || 0.0,
        locationLng: locationLng || 0.0,
        notes: notes || null,
        status: 'PENDING',
      },
      include: {
        hospital: { select: { name: true } }
      }
    });

    // Broadcast to Socket.IO if available
    const io = req.app.get('io');
    if (io) {
      io.to('HOSPITAL_STAFF').emit('emergency_alert', emergency);
      io.to('DOCTOR').emit('emergency_alert', emergency);
      io.to('SUPER_ADMIN').emit('emergency_alert', emergency);
    }

    res.status(201).json({
      status: 'success',
      data: {
        emergency,
        routing: routingResult || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Analyze symptoms (without saving)
exports.analyzeOnly = async (req, res, next) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || symptoms.length === 0) {
      return next(new AppError('Please provide at least one symptom', 400));
    }

    const aiResult = await analyzeSymptoms(symptoms);

    res.json({
      status: 'success',
      data: { analysis: aiResult },
    });
  } catch (error) {
    next(error);
  }
};

// Get all emergencies (for Hospital Staff / Admins)
exports.getEmergencies = async (req, res, next) => {
  try {
    const { status, severity, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * parseInt(limit);
    
    const where = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [emergencies, total] = await Promise.all([
      prisma.emergencyCase.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { name: true, phone: true } },
          hospital: { select: { name: true } },
          ambulance: { select: { vehicleNumber: true } }
        }
      }),
      prisma.emergencyCase.count({ where })
    ]);

    res.json({
      status: 'success',
      results: emergencies.length,
      total,
      data: { emergencies },
    });
  } catch (error) {
    next(error);
  }
};

// Get single emergency
exports.getEmergency = async (req, res, next) => {
  try {
    const emergency = await prisma.emergencyCase.findUnique({
      where: { id: req.params.id },
      include: {
        patient: { select: { name: true, phone: true } },
        hospital: { select: { name: true } },
        ambulance: { select: { vehicleNumber: true, status: true } },
        triageLogs: { orderBy: { createdAt: 'desc' } },
        doctorNotes: { include: { doctor: { select: { name: true } } } }
      }
    });

    if (!emergency) {
      return next(new AppError('Emergency case not found', 404));
    }

    res.json({
      status: 'success',
      data: { emergency },
    });
  } catch (error) {
    next(error);
  }
};

// Update emergency status
exports.updateEmergency = async (req, res, next) => {
  try {
    const { status, notes, ambulanceId, hospitalId } = req.body;

    const data = {};
    if (status) data.status = status;
    if (notes) data.notes = notes;
    if (ambulanceId) data.ambulanceId = ambulanceId;
    if (hospitalId) data.hospitalId = hospitalId;
    
    if (status === 'RESOLVED') {
      data.resolvedAt = new Date();
      stopTelemetryStream(req.params.id);
    }

    if (Object.keys(data).length === 0) {
      return next(new AppError('No fields provided to update', 400));
    }

    const emergency = await prisma.emergencyCase.update({
      where: { id: req.params.id },
      data,
      include: {
        hospital: { select: { name: true } },
        ambulance: { select: { vehicleNumber: true } }
      }
    });
    
    // Broadcast status change
    const io = req.app.get('io');
    if (io) {
       io.emit('emergency_updated', emergency);
    }

    res.json({
      status: 'success',
      data: { emergency },
    });
  } catch (error) {
    // Check if error is Prisma record not found
    if (error.code === 'P2025') {
       return next(new AppError('Emergency case not found', 404));
    }
    next(error);
  }
};
