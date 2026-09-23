const prisma = require('../config/prismaClient');
const AppError = require('../utils/AppError');
const { calculateMatchScore } = require('../services/transplantMatchingEngine');

exports.registerDonor = async (req, res, next) => {
  try {
    const { bloodGroup, organType, externalDonorName } = req.body;
    
    // User can register themselves, or staff can register external donor
    const userId = req.user.role === 'PATIENT' ? req.user.id : null;
    
    if (!bloodGroup || !organType) {
      return next(new AppError('Blood group and organ type are required', 400));
    }

    const donor = await prisma.donor.create({
      data: {
        userId,
        externalDonorName,
        bloodGroup,
        organType
      }
    });

    res.status(201).json({
      status: 'success',
      data: { donor }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new AppError('You are already registered as a donor', 400));
    }
    next(error);
  }
};

exports.getDonors = async (req, res, next) => {
  try {
    const donors = await prisma.donor.findMany({
      where: { isActive: true },
      include: {
        user: { select: { name: true, phone: true } }
      },
      orderBy: { registeredAt: 'desc' }
    });
    
    res.json({
      status: 'success',
      results: donors.length,
      data: { donors }
    });
  } catch (error) {
    next(error);
  }
};

exports.addWaitlist = async (req, res, next) => {
  try {
    const { patientId, organType, bloodGroup, urgencyScore } = req.body;

    const waitlist = await prisma.transplantWaitlist.create({
      data: {
        patientId,
        organType,
        bloodGroup,
        urgencyScore: parseInt(urgencyScore)
      },
      include: {
        patient: { select: { name: true } }
      }
    });

    res.status(201).json({
      status: 'success',
      data: { waitlist }
    });
  } catch (error) {
    next(error);
  }
};

exports.getWaitlist = async (req, res, next) => {
  try {
    const waitlist = await prisma.transplantWaitlist.findMany({
      where: { status: 'WAITING' },
      include: {
        patient: { select: { name: true, phone: true } }
      },
      orderBy: [
        { urgencyScore: 'desc' },
        { waitingSince: 'asc' }
      ]
    });

    res.json({
      status: 'success',
      results: waitlist.length,
      data: { waitlist }
    });
  } catch (error) {
    next(error);
  }
};

exports.findMatchesForWaitlist = async (req, res, next) => {
  try {
    const { id } = req.params;

    const waitlist = await prisma.transplantWaitlist.findUnique({
      where: { id },
      include: { patient: { select: { name: true } } }
    });

    if (!waitlist) return next(new AppError('Waitlist entry not found', 404));

    // Get all active donors
    const donors = await prisma.donor.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true } } }
    });

    // Score and rank matches
    const matches = donors.map(donor => {
      const score = calculateMatchScore(waitlist, donor);
      return { donor, score };
    })
    .filter(m => m.score > 0) // Filter incompatible
    .sort((a, b) => b.score - a.score); // Highest score first

    res.json({
      status: 'success',
      results: matches.length,
      data: { matches }
    });
  } catch (error) {
    next(error);
  }
};

exports.matchOrgan = async (req, res, next) => {
  try {
    const { waitlistId, donorId } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const waitlist = await tx.transplantWaitlist.update({
        where: { id: waitlistId },
        data: { 
          status: 'MATCHED',
          matchedDonorId: donorId
        }
      });

      await tx.donor.update({
        where: { id: donorId },
        data: { isActive: false }
      });

      return waitlist;
    });

    res.json({
      status: 'success',
      data: { waitlist: result }
    });
  } catch (error) {
    next(error);
  }
};
