const prisma = require('../config/prismaClient');
const { rankHospitals } = require('../services/routingEngine');
const AppError = require('../utils/AppError');

// Get all hospitals with filtering
exports.getHospitals = async (req, res, next) => {
  try {
    const { search, specialty, availableOnly } = req.query;

    const where = { isActive: true };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (specialty) {
      where.specialties = { has: specialty };
    }
    if (availableOnly === 'true') {
      where.availableBeds = { gt: 0 };
    }

    const hospitals = await prisma.hospital.findMany({
      where,
      orderBy: [{ availableBeds: 'desc' }],
      include: { resources: true },
    });

    res.json({
      status: 'success',
      results: hospitals.length,
      data: { hospitals },
    });
  } catch (error) {
    next(error);
  }
};

// Get single hospital with its resources
exports.getHospital = async (req, res, next) => {
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: req.params.id },
      include: {
        resources: true,
        emergencies: {
          where: { status: { in: ['PENDING', 'DISPATCHED', 'ADMITTED'] } },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, severity: true, status: true, createdAt: true },
        },
      },
    });

    if (!hospital) {
      return next(new AppError('Hospital not found', 404));
    }

    res.json({
      status: 'success',
      data: { hospital },
    });
  } catch (error) {
    next(error);
  }
};

// Smart Hospital Recommendation — the core routing endpoint
exports.recommendHospital = async (req, res, next) => {
  try {
    const { locationLat, locationLng, severity, symptoms } = req.body;

    if (!locationLat || !locationLng) {
      return next(new AppError('Patient location (lat/lng) is required for routing', 400));
    }

    const hospitals = await prisma.hospital.findMany({
      where: { isActive: true },
    });

    if (hospitals.length === 0) {
      return next(new AppError('No hospitals available in the system', 404));
    }

    const emergency = {
      locationLat: parseFloat(locationLat),
      locationLng: parseFloat(locationLng),
      severity: severity || 'YELLOW',
      symptoms: symptoms || [],
    };

    const ranking = rankHospitals(hospitals, emergency);

    res.json({
      status: 'success',
      data: {
        recommendation: ranking.recommended,
        alternatives: ranking.alternatives,
        metadata: ranking.routingMetadata,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update hospital resources (for Hospital Staff)
exports.updateResources = async (req, res, next) => {
  try {
    const { availableBeds, currentLoad, hasICU } = req.body;

    const data = {};
    if (availableBeds !== undefined) data.availableBeds = availableBeds;
    if (currentLoad !== undefined) data.currentLoad = currentLoad;
    if (hasICU !== undefined) data.hasICU = hasICU;

    const hospital = await prisma.hospital.update({
      where: { id: req.params.id },
      data,
    });

    // Broadcast capacity change via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('hospital_capacity_update', {
        hospitalId: hospital.id,
        name: hospital.name,
        availableBeds: hospital.availableBeds,
        currentLoad: hospital.currentLoad,
      });
    }

    res.json({
      status: 'success',
      data: { hospital },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new AppError('Hospital not found', 404));
    }
    next(error);
  }
};
