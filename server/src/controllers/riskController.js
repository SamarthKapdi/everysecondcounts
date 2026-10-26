const prisma = require('../config/prismaClient');
const AppError = require('../utils/AppError');
const { recomputePatientRisk } = require('../services/riskService');

/**
 * Checks privacy permissions for reading a patient's risk assessment.
 */
const checkRiskAccess = async (requester, targetPatientId) => {
  if (requester.id === targetPatientId) return true;
  if (requester.role === 'SUPER_ADMIN') return true;

  if (requester.role === 'DOCTOR') {
    const consultation = await prisma.consultation.findFirst({
      where: {
        patientId: targetPatientId,
        doctorId: requester.id,
        status: { in: ['PENDING', 'ACTIVE'] }
      }
    });
    if (consultation) return true;

    const admission = await prisma.admission.findFirst({
      where: {
        patientId: targetPatientId,
        assignedDoctorId: requester.id,
        stage: { not: 'DISCHARGED' }
      }
    });
    if (admission) return true;
  }

  if (requester.role === 'HOSPITAL_STAFF') {
    const admission = await prisma.admission.findFirst({
      where: {
        patientId: targetPatientId,
        stage: { not: 'DISCHARGED' }
      }
    });
    if (admission) return true;
  }

  return false;
};

/**
 * GET /api/risk/me
 * Retrieves current logged-in patient's latest risk assessment and history.
 */
exports.getMyRisk = async (req, res, next) => {
  try {
    const patientId = req.user.id;

    // Get latest assessment
    let latest = await prisma.riskAssessment.findFirst({
      where: { patientId },
      orderBy: { createdAt: 'desc' }
    });

    // If none exists, compute it now
    if (!latest) {
      latest = await recomputePatientRisk(patientId, req.app.get('io'));
    }

    // Get 14-day history
    const history = await prisma.riskAssessment.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: 14
    });

    res.json({
      status: 'success',
      data: {
        assessment: latest,
        history: history.reverse(),
        disclaimer: 'Decision-Support Disclaimer: This screening tool does not provide a medical diagnosis. LOW risk denotes no elevated risk detected from entered data.'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/risk/patient/:id
 * Retrieves target patient's risk assessment. Restricted to authorized clinicians.
 */
exports.getPatientRisk = async (req, res, next) => {
  try {
    const targetPatientId = req.params.id;

    const hasAccess = await checkRiskAccess(req.user, targetPatientId);
    if (!hasAccess) {
      return next(new AppError('Access denied. Active clinical relationship (consultation or admission) required to view patient risk assessment.', 403));
    }

    let latest = await prisma.riskAssessment.findFirst({
      where: { patientId: targetPatientId },
      orderBy: { createdAt: 'desc' }
    });

    if (!latest) {
      latest = await recomputePatientRisk(targetPatientId, req.app.get('io'));
    }

    const history = await prisma.riskAssessment.findMany({
      where: { patientId: targetPatientId },
      orderBy: { createdAt: 'desc' },
      take: 14
    });

    res.json({
      status: 'success',
      data: {
        assessment: latest,
        history: history.reverse(),
        disclaimer: 'Clinical Decision-Support: Intended for risk stratification and monitoring, not primary diagnosis.'
      }
    });
  } catch (error) {
    next(error);
  }
};
