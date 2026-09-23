const prisma = require('../config/prismaClient');
const AppError = require('../utils/AppError');
const { haversineDistance } = require('../services/routingEngine');

// ── Inventory Management ──

exports.updateInventory = async (req, res, next) => {
  try {
    const { bloodGroup, unitsAvailable } = req.body;
    // Assume HOSPITAL_STAFF is linked to a hospital; in this project, they might provide it in body or we use a demo hospital ID.
    // For simplicity, we'll take hospitalId from body, but validate it.
    const hospitalId = req.body.hospitalId; 
    
    if (!hospitalId || !bloodGroup || unitsAvailable === undefined) {
      return next(new AppError('Hospital ID, blood group, and units are required', 400));
    }

    const inventory = await prisma.bloodInventory.upsert({
      where: {
        hospitalId_bloodGroup: {
          hospitalId,
          bloodGroup
        }
      },
      update: {
        unitsAvailable: parseInt(unitsAvailable)
      },
      create: {
        hospitalId,
        bloodGroup,
        unitsAvailable: parseInt(unitsAvailable)
      }
    });

    res.json({
      status: 'success',
      data: { inventory }
    });
  } catch (error) {
    next(error);
  }
};

exports.getInventory = async (req, res, next) => {
  try {
    const { hospitalId, bloodGroup } = req.query;
    const where = {};
    if (hospitalId) where.hospitalId = hospitalId;
    if (bloodGroup) where.bloodGroup = bloodGroup;

    const inventory = await prisma.bloodInventory.findMany({
      where,
      include: {
        hospital: { select: { name: true, location: true } }
      },
      orderBy: { lastUpdated: 'desc' }
    });

    res.json({
      status: 'success',
      results: inventory.length,
      data: { inventory }
    });
  } catch (error) {
    next(error);
  }
};


// ── Request Management ──

exports.requestBlood = async (req, res, next) => {
  try {
    const { admissionId, bloodGroup, unitsRequested } = req.body;

    if (!admissionId || !bloodGroup || !unitsRequested) {
      return next(new AppError('Missing required fields for blood request', 400));
    }

    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: { hospital: true }
    });

    if (!admission) return next(new AppError('Admission not found', 404));

    // 1. Create the request
    const bloodRequest = await prisma.bloodRequest.create({
      data: {
        admissionId,
        bloodGroup,
        unitsRequested: parseInt(unitsRequested),
        requestedById: req.user.id
      }
    });

    // 2. Auto-match: Find hospitals with sufficient inventory
    // Get all hospitals with this blood group and enough units
    const availableInventories = await prisma.bloodInventory.findMany({
      where: {
        bloodGroup,
        unitsAvailable: { gte: parseInt(unitsRequested) }
      },
      include: { hospital: true }
    });

    let matchedHospitalId = null;
    let minDistance = Infinity;

    const requestLat = admission.hospital.locationLat;
    const requestLng = admission.hospital.locationLng;

    // Find the closest hospital with inventory
    for (const inv of availableInventories) {
      // If the same hospital has it, use it immediately
      if (inv.hospitalId === admission.hospitalId) {
        matchedHospitalId = inv.hospitalId;
        break;
      }

      // Otherwise calculate distance
      const distance = haversineDistance(
        requestLat,
        requestLng,
        inv.hospital.locationLat,
        inv.hospital.locationLng
      );

      if (distance < minDistance) {
        minDistance = distance;
        matchedHospitalId = inv.hospitalId;
      }
    }

    // 3. If matched, update status to MATCHED (awaiting staff fulfillment)
    let finalRequest = bloodRequest;
    if (matchedHospitalId) {
      finalRequest = await prisma.bloodRequest.update({
        where: { id: bloodRequest.id },
        data: { status: 'MATCHED' } // We don't deduct yet, wait for manual fulfillment or API integration
      });
    } else {
      finalRequest = await prisma.bloodRequest.update({
        where: { id: bloodRequest.id },
        data: { status: 'UNAVAILABLE' }
      });
    }

    res.status(201).json({
      status: 'success',
      matchedHospitalId, // Suggests where to get it from
      data: { request: finalRequest }
    });

  } catch (error) {
    next(error);
  }
};

exports.fulfillRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { sourceHospitalId } = req.body; // The hospital providing the blood

    const request = await prisma.bloodRequest.findUnique({
      where: { id: requestId }
    });

    if (!request || request.status === 'FULFILLED') {
      return next(new AppError('Request not found or already fulfilled', 400));
    }

    // Use a transaction to deduct inventory and mark fulfilled safely
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify and deduct inventory
      const inventory = await tx.bloodInventory.findUnique({
        where: {
          hospitalId_bloodGroup: {
            hospitalId: sourceHospitalId,
            bloodGroup: request.bloodGroup
          }
        }
      });

      if (!inventory || inventory.unitsAvailable < request.unitsRequested) {
        throw new AppError('Insufficient inventory at source hospital', 400);
      }

      await tx.bloodInventory.update({
        where: { id: inventory.id },
        data: { unitsAvailable: { decrement: request.unitsRequested } }
      });

      // 2. Mark request fulfilled
      const fulfilledReq = await tx.bloodRequest.update({
        where: { id: requestId },
        data: {
          status: 'FULFILLED',
          fulfilledAt: new Date(),
          fulfilledFromHospitalId: sourceHospitalId
        },
        include: {
          fulfilledFromHospital: { select: { name: true } }
        }
      });

      return fulfilledReq;
    });

    res.json({
      status: 'success',
      data: { request: result }
    });
  } catch (error) {
    next(error);
  }
};

exports.getRequests = async (req, res, next) => {
  try {
    const { admissionId, status } = req.query;
    const where = {};
    if (admissionId) where.admissionId = admissionId;
    if (status) where.status = status;

    const requests = await prisma.bloodRequest.findMany({
      where,
      include: {
        requestedBy: { select: { name: true, role: true } },
        admission: {
          select: {
            patient: { select: { name: true } },
            hospital: { select: { name: true } }
          }
        },
        fulfilledFromHospital: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      status: 'success',
      results: requests.length,
      data: { requests }
    });
  } catch (error) {
    next(error);
  }
};
