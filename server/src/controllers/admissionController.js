const prisma = require('../config/prismaClient');
const AppError = require('../utils/AppError');

// Valid forward-only stage transitions
const STAGE_ORDER = [
  'REGISTERED', 'TRIAGED', 'ADMITTED', 'IN_TREATMENT',
  'UNDER_OBSERVATION', 'READY_FOR_DISCHARGE', 'DISCHARGED'
];

const isValidTransition = (currentStage, newStage) => {
  // TRANSFERRED is a special terminal state allowed from any non-terminal stage
  if (newStage === 'TRANSFERRED' && currentStage !== 'DISCHARGED' && currentStage !== 'TRANSFERRED') {
    return true;
  }
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const newIdx = STAGE_ORDER.indexOf(newStage);
  // Only allow moving forward by exactly 1 step
  return currentIdx >= 0 && newIdx >= 0 && newIdx === currentIdx + 1;
};

// Create admission from an EmergencyCase
exports.createAdmission = async (req, res, next) => {
  try {
    const { emergencyCaseId, hospitalId, assignedDoctorId } = req.body;

    if (!emergencyCaseId) {
      return next(new AppError('Emergency Case ID is required', 400));
    }

    // Verify the emergency case exists and is not already admitted
    const emergencyCase = await prisma.emergencyCase.findUnique({
      where: { id: emergencyCaseId },
      include: { admission: true }
    });

    if (!emergencyCase) {
      return next(new AppError('Emergency case not found', 404));
    }

    if (emergencyCase.admission) {
      return next(new AppError('This emergency case already has an admission record', 409));
    }

    const targetHospitalId = hospitalId || emergencyCase.hospitalId;
    if (!targetHospitalId) {
      return next(new AppError('Hospital ID is required (not assigned to emergency case)', 400));
    }

    // Create admission + empty billing in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const admission = await tx.admission.create({
        data: {
          emergencyCaseId,
          patientId: emergencyCase.patientId,
          hospitalId: targetHospitalId,
          assignedDoctorId: assignedDoctorId || null,
          stage: 'REGISTERED',
        },
        include: {
          patient: { select: { name: true, phone: true } },
          hospital: { select: { name: true } },
          emergencyCase: { select: { severity: true, symptoms: true } },
        }
      });

      const billing = await tx.billing.create({
        data: {
          admissionId: admission.id,
          totalAmount: 0,
          amountPaid: 0,
          status: 'PENDING',
        }
      });

      return { admission, billing };
    });

    res.status(201).json({
      status: 'success',
      data: {
        admission: result.admission,
        billing: result.billing,
      },
    });
  } catch (error) {
    console.error('createAdmission error:', error.message);
    next(error);
  }
};

// Get all admissions with filtering
exports.getAdmissions = async (req, res, next) => {
  try {
    const { stage, hospitalId, patientId, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * parseInt(limit);

    const where = {};
    if (stage) where.stage = stage;
    if (hospitalId) where.hospitalId = hospitalId;
    if (patientId) where.patientId = patientId;

    // If user is a patient, only show their own admissions
    if (req.user.role === 'PATIENT') {
      where.patientId = req.user.id;
    }

    const [admissions, total] = await Promise.all([
      prisma.admission.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { name: true, phone: true } },
          hospital: { select: { name: true } },
          assignedDoctor: { select: { name: true } },
          emergencyCase: { select: { severity: true, symptoms: true, status: true } },
          billing: true,
        }
      }),
      prisma.admission.count({ where })
    ]);

    res.json({
      status: 'success',
      results: admissions.length,
      total,
      data: { admissions },
    });
  } catch (error) {
    console.error('getAdmissions error:', error.message);
    next(error);
  }
};

// Get single admission
exports.getAdmission = async (req, res, next) => {
  try {
    const admission = await prisma.admission.findUnique({
      where: { id: req.params.id },
      include: {
        patient: { select: { name: true, phone: true, email: true } },
        hospital: { select: { name: true, address: true, phone: true } },
        assignedDoctor: { select: { name: true } },
        emergencyCase: {
          select: { severity: true, symptoms: true, status: true, aiReasoning: true, recommendedAction: true }
        },
        billing: true,
      }
    });

    if (!admission) {
      return next(new AppError('Admission not found', 404));
    }

    res.json({
      status: 'success',
      data: { admission },
    });
  } catch (error) {
    console.error('getAdmission error:', error.message);
    next(error);
  }
};

// Update admission stage (forward-only transitions)
exports.updateStage = async (req, res, next) => {
  try {
    const { stage } = req.body;

    if (!stage) {
      return next(new AppError('New stage is required', 400));
    }

    const admission = await prisma.admission.findUnique({
      where: { id: req.params.id },
      include: { billing: true }
    });

    if (!admission) {
      return next(new AppError('Admission not found', 404));
    }

    // Validate forward-only transition
    if (!isValidTransition(admission.stage, stage)) {
      return next(new AppError(
        `Invalid stage transition: ${admission.stage} → ${stage}. Only forward transitions are allowed.`,
        400
      ));
    }

    // Block discharge if billing is PENDING
    if (stage === 'DISCHARGED' && admission.billing?.status === 'PENDING' && admission.billing?.totalAmount > 0) {
      return next(new AppError(
        'Cannot discharge: billing is still PENDING. Please settle or waive the bill first.',
        400
      ));
    }

    // Build update data
    const updateData = { stage };
    if (stage === 'ADMITTED') {
      updateData.admittedAt = new Date();
    }

    // Use transaction to sync EmergencyCase.status
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.admission.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          patient: { select: { name: true } },
          hospital: { select: { name: true } },
          billing: true,
          emergencyCase: { select: { id: true, status: true } },
        }
      });

      // Sync EmergencyCase.status when admission stage reaches ADMITTED
      if (stage === 'ADMITTED') {
        await tx.emergencyCase.update({
          where: { id: updated.emergencyCaseId },
          data: { status: 'ADMITTED' }
        });
      }

      // Sync EmergencyCase.status when discharged
      if (stage === 'DISCHARGED') {
        await tx.emergencyCase.update({
          where: { id: updated.emergencyCaseId },
          data: { status: 'RESOLVED', resolvedAt: new Date() }
        });
      }

      return updated;
    });

    // Broadcast stage change via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to('HOSPITAL_STAFF').emit('admission_stage_update', {
        admissionId: result.id,
        stage: result.stage,
        patientName: result.patient?.name,
      });
    }

    res.json({
      status: 'success',
      data: { admission: result },
    });
  } catch (error) {
    console.error('updateStage error:', error.message);
    if (error.code === 'P2025') {
      return next(new AppError('Admission not found', 404));
    }
    next(error);
  }
};

// Update billing (Hospital Staff / Admin)
exports.updateBilling = async (req, res, next) => {
  try {
    const { totalAmount, amountPaid, itemizedCharges, status } = req.body;

    const admission = await prisma.admission.findUnique({
      where: { id: req.params.id },
      include: { billing: true }
    });

    if (!admission) {
      return next(new AppError('Admission not found', 404));
    }

    if (!admission.billing) {
      return next(new AppError('No billing record found for this admission', 404));
    }

    // Use transaction for money-affecting update
    const billing = await prisma.$transaction(async (tx) => {
      const updateData = {};
      if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
      if (amountPaid !== undefined) updateData.amountPaid = amountPaid;
      if (itemizedCharges !== undefined) updateData.itemizedCharges = itemizedCharges;

      // Auto-calculate status from amounts if not explicitly provided
      if (status) {
        updateData.status = status;
      } else if (updateData.totalAmount !== undefined || updateData.amountPaid !== undefined) {
        const newTotal = updateData.totalAmount !== undefined ? updateData.totalAmount : admission.billing.totalAmount;
        const newPaid = updateData.amountPaid !== undefined ? updateData.amountPaid : admission.billing.amountPaid;
        if (newTotal <= 0) {
          updateData.status = 'WAIVED';
        } else if (newPaid >= newTotal) {
          updateData.status = 'FULLY_PAID';
        } else if (newPaid > 0) {
          updateData.status = 'PARTIALLY_PAID';
        }
      }

      return tx.billing.update({
        where: { id: admission.billing.id },
        data: updateData,
      });
    });

    res.json({
      status: 'success',
      data: { billing },
    });
  } catch (error) {
    console.error('updateBilling error:', error.message);
    next(error);
  }
};

// Discharge patient
exports.dischargePatient = async (req, res, next) => {
  try {
    const { dischargeSummary } = req.body;

    const admission = await prisma.admission.findUnique({
      where: { id: req.params.id },
      include: { billing: true }
    });

    if (!admission) {
      return next(new AppError('Admission not found', 404));
    }

    // Must be in READY_FOR_DISCHARGE stage
    if (admission.stage !== 'READY_FOR_DISCHARGE') {
      return next(new AppError(
        `Cannot discharge: patient is in ${admission.stage} stage. Must be READY_FOR_DISCHARGE first.`,
        400
      ));
    }

    // Block if billing is PENDING with outstanding amount
    if (admission.billing?.status === 'PENDING' && admission.billing?.totalAmount > 0) {
      return next(new AppError(
        'Cannot discharge: billing is still PENDING. Please settle or waive the bill first.',
        400
      ));
    }

    // Transaction: update admission + emergency case
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.admission.update({
        where: { id: req.params.id },
        data: {
          stage: 'DISCHARGED',
          dischargedAt: new Date(),
          dischargeSummary: dischargeSummary || null,
        },
        include: {
          patient: { select: { name: true } },
          hospital: { select: { name: true } },
          billing: true,
        }
      });

      await tx.emergencyCase.update({
        where: { id: updated.emergencyCaseId },
        data: { status: 'RESOLVED', resolvedAt: new Date() }
      });

      return updated;
    });

    res.json({
      status: 'success',
      message: 'Patient discharged successfully.',
      data: { admission: result },
    });
  } catch (error) {
    console.error('dischargePatient error:', error.message);
    next(error);
  }
};
