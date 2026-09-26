const prisma = require('../config/prismaClient');
const AppError = require('../utils/AppError');

// ── Policy Management ──

exports.createPolicy = async (req, res, next) => {
  try {
    const { provider, policyNumber, coverageAmount, validUntil, patientId } = req.body;
    
    // PATIENTs can only create for themselves; ADMIN/STAFF can create for any patient
    const targetPatientId = req.user.role === 'PATIENT' ? req.user.id : patientId;
    
    if (!targetPatientId) {
      return next(new AppError('Patient ID is required', 400));
    }

    const policy = await prisma.insurancePolicy.create({
      data: {
        patientId: targetPatientId,
        provider,
        policyNumber,
        coverageAmount: parseFloat(coverageAmount),
        validUntil: new Date(validUntil)
      }
    });

    res.status(201).json({
      status: 'success',
      data: { policy }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new AppError('A policy with this number already exists', 400));
    }
    next(error);
  }
};

exports.getPatientPolicies = async (req, res, next) => {
  try {
    const patientId = req.user.role === 'PATIENT' ? req.user.id : req.params.patientId;
    
    if (!patientId) {
      return next(new AppError('Patient ID is required', 400));
    }

    const policies = await prisma.insurancePolicy.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      status: 'success',
      results: policies.length,
      data: { policies }
    });
  } catch (error) {
    next(error);
  }
};


// ── Claims Management ──

exports.submitClaim = async (req, res, next) => {
  try {
    const { policyId, hospitalId, billingId, claimAmount, claimDocuments } = req.body;

    // Verify Policy exists & belongs to the patient if requested by PATIENT
    const policy = await prisma.insurancePolicy.findUnique({ where: { id: policyId } });
    if (!policy) return next(new AppError('Policy not found', 404));
    
    if (req.user.role === 'PATIENT' && policy.patientId !== req.user.id) {
      return next(new AppError('Not authorized to use this policy', 403));
    }

    // Verify Billing exists and is pending
    const billing = await prisma.billing.findUnique({ where: { id: billingId } });
    if (!billing) return next(new AppError('Billing record not found', 404));

    // Create the claim and update billing status to INSURANCE_PROCESSING
    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.insuranceClaim.create({
        data: {
          policyId,
          patientId: policy.patientId,
          hospitalId,
          billingId,
          claimAmount: parseFloat(claimAmount),
          claimDocuments: claimDocuments || [],
          status: 'SUBMITTED'
        }
      });

      await tx.billing.update({
        where: { id: billingId },
        data: { status: 'INSURANCE_PROCESSING' }
      });

      return claim;
    });

    res.status(201).json({
      status: 'success',
      data: { claim: result }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new AppError('A claim has already been submitted for this bill', 400));
    }
    next(error);
  }
};

exports.getClaims = async (req, res, next) => {
  try {
    const { status, hospitalId } = req.query;
    const where = {};
    
    if (status) where.status = status;
    if (hospitalId) where.hospitalId = hospitalId;
    
    // Filtering by Role
    if (req.user.role === 'PATIENT') {
      where.patientId = req.user.id;
    } else if (req.user.role === 'HOSPITAL_STAFF' && !hospitalId) {
      // In a real app, staff might be linked to a hospital; assuming global access for demo
    }

    const claims = await prisma.insuranceClaim.findMany({
      where,
      include: {
        policy: { select: { provider: true, policyNumber: true } },
        patient: { select: { name: true, phone: true } },
        hospital: { select: { name: true } },
        billing: { select: { totalAmount: true, amountPaid: true, status: true } }
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.json({
      status: 'success',
      results: claims.length,
      data: { claims }
    });
  } catch (error) {
    next(error);
  }
};

exports.getClaim = async (req, res, next) => {
  try {
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: req.params.id },
      include: {
        policy: true,
        patient: { select: { name: true, email: true, phone: true } },
        hospital: { select: { name: true, address: true } },
        billing: true
      }
    });

    if (!claim) return next(new AppError('Claim not found', 404));

    // Access control for PATIENT role
    if (req.user.role === 'PATIENT' && claim.patientId !== req.user.id) {
      return next(new AppError('Not authorized', 403));
    }

    res.json({
      status: 'success',
      data: { claim }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateClaimStatus = async (req, res, next) => {
  try {
    const { status, approvedAmount, reviewerNotes } = req.body;
    
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: req.params.id },
      include: { billing: true, policy: true }
    });

    if (!claim) return next(new AppError('Claim not found', 404));

    const updateData = { status };
    if (reviewerNotes) updateData.reviewerNotes = reviewerNotes;
    if (approvedAmount !== undefined) {
      updateData.approvedAmount = parseFloat(approvedAmount);
      // Ensure we don't exceed coverage
      if (updateData.approvedAmount > claim.policy.coverageAmount) {
        return next(new AppError('Approved amount cannot exceed policy coverage limit', 400));
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedClaim = await tx.insuranceClaim.update({
        where: { id: req.params.id },
        data: updateData
      });

      // Sync Billing Status if Claim is finalized
      if (status === 'APPROVED' && updatedClaim.approvedAmount !== undefined) {
        // Assume approved amount pays the bill directly for simplicity
        const newPaid = claim.billing.amountPaid + updatedClaim.approvedAmount;
        let newBillStatus = 'PARTIALLY_PAID';
        if (newPaid >= claim.billing.totalAmount) {
          newBillStatus = 'FULLY_PAID';
        }
        
        await tx.billing.update({
          where: { id: claim.billingId },
          data: { 
            amountPaid: newPaid,
            status: newBillStatus 
          }
        });
      } else if (status === 'REJECTED') {
        // Revert billing back to pending for patient to pay out-of-pocket
        await tx.billing.update({
          where: { id: claim.billingId },
          data: { status: 'PENDING' }
        });
      }

      return updatedClaim;
    });

    res.json({
      status: 'success',
      data: { claim: result }
    });
  } catch (error) {
    next(error);
  }
};
