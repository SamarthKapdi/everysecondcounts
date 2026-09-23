const prisma = require('../config/prismaClient');
const AppError = require('../utils/AppError');

exports.createCampaign = async (req, res, next) => {
  try {
    const { title, description, targetAmount, admissionId } = req.body;
    
    const patientId = req.user.role === 'PATIENT' ? req.user.id : req.body.patientId;

    if (!patientId || !title || !description || !targetAmount) {
      return next(new AppError('Missing required fields', 400));
    }

    // Verify there is an active admission if admissionId is provided
    if (admissionId) {
      const admission = await prisma.admission.findUnique({
        where: { id: admissionId },
        include: { billing: true }
      });
      if (!admission) return next(new AppError('Admission not found', 404));
      
      // Target amount ideally shouldn't exceed billing total, but we'll let it pass for flexibility
    }

    const campaign = await prisma.fundraisingCampaign.create({
      data: {
        patientId,
        admissionId: admissionId || null,
        title,
        description,
        targetAmount: parseFloat(targetAmount)
      }
    });

    res.status(201).json({
      status: 'success',
      data: { campaign }
    });
  } catch (error) {
    next(error);
  }
};

exports.getCampaigns = async (req, res, next) => {
  try {
    // Public route, anyone can see campaigns
    const { status, patientId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;

    const campaigns = await prisma.fundraisingCampaign.findMany({
      where,
      include: {
        patient: { select: { name: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      status: 'success',
      results: campaigns.length,
      data: { campaigns }
    });
  } catch (error) {
    next(error);
  }
};

exports.getCampaign = async (req, res, next) => {
  try {
    const campaign = await prisma.fundraisingCampaign.findUnique({
      where: { id: req.params.id },
      include: {
        patient: { select: { name: true, avatarUrl: true } },
        contributions: {
          orderBy: { contributedAt: 'desc' },
          select: { id: true, amount: true, contributorName: true, isAnonymous: true, contributedAt: true }
        }
      }
    });

    if (!campaign) return next(new AppError('Campaign not found', 404));

    res.json({
      status: 'success',
      data: { campaign }
    });
  } catch (error) {
    next(error);
  }
};

exports.contribute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, contributorName, isAnonymous } = req.body;
    
    // Optional auth
    const userId = req.user ? req.user.id : null;
    
    const contribAmount = parseFloat(amount);
    if (!contribAmount || contribAmount <= 0) {
      return next(new AppError('Valid amount is required', 400));
    }

    const result = await prisma.$transaction(async (tx) => {
      const campaign = await tx.fundraisingCampaign.findUnique({ where: { id } });
      if (!campaign || campaign.status !== 'ACTIVE') {
        throw new AppError('Campaign not found or not active', 400);
      }

      const contribution = await tx.contribution.create({
        data: {
          campaignId: id,
          userId,
          amount: contribAmount,
          contributorName: isAnonymous ? 'Anonymous' : (contributorName || 'Anonymous'),
          isAnonymous: isAnonymous || false
        }
      });

      const newAmountRaised = campaign.amountRaised + contribAmount;
      const newStatus = newAmountRaised >= campaign.targetAmount ? 'CLOSED' : 'ACTIVE';

      await tx.fundraisingCampaign.update({
        where: { id },
        data: {
          amountRaised: newAmountRaised,
          status: newStatus
        }
      });

      return contribution;
    });

    res.status(201).json({
      status: 'success',
      data: { contribution: result }
    });
  } catch (error) {
    next(error);
  }
};
