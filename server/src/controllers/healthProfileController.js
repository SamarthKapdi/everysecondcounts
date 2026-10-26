const prisma = require('../config/prismaClient');
const AppError = require('../utils/AppError');

/**
 * Calculates profile completeness percentage based on monitored clinical fields.
 */
const calculateCompleteness = (data) => {
  const fields = [
    'dateOfBirth', 'sex', 'heightCm', 'weightKg', 'bloodGroup',
    'restingBpSystolic', 'restingBpDiastolic', 'restingHeartRate',
    'totalCholesterol', 'ldl', 'hdl', 'triglycerides',
    'fastingGlucose', 'hba1c', 'smokingStatus', 'alcoholUse',
    'activityLevel', 'sleepHoursAvg', 'emergencyContact'
  ];
  let filled = 0;
  for (const f of fields) {
    if (data[f] !== null && data[f] !== undefined && data[f] !== '') {
      filled++;
    }
  }
  if (data.currentMedications || data.allergies) {
    filled++;
  }
  const total = fields.length + 1;
  return Math.min(100, Math.round((filled / total) * 100));
};

/**
 * Validates clinical ranges for sane inputs.
 */
const validateRanges = (data) => {
  const errors = [];
  if (data.heightCm !== undefined && data.heightCm !== null) {
    if (data.heightCm < 50 || data.heightCm > 250) errors.push('Height must be between 50 and 250 cm');
  }
  if (data.weightKg !== undefined && data.weightKg !== null) {
    if (data.weightKg < 20 || data.weightKg > 350) errors.push('Weight must be between 20 and 350 kg');
  }
  if (data.restingBpSystolic !== undefined && data.restingBpSystolic !== null) {
    if (data.restingBpSystolic < 60 || data.restingBpSystolic > 260) errors.push('Systolic BP must be between 60 and 260 mmHg');
  }
  if (data.restingBpDiastolic !== undefined && data.restingBpDiastolic !== null) {
    if (data.restingBpDiastolic < 40 || data.restingBpDiastolic > 160) errors.push('Diastolic BP must be between 40 and 160 mmHg');
  }
  if (data.restingHeartRate !== undefined && data.restingHeartRate !== null) {
    if (data.restingHeartRate < 35 || data.restingHeartRate > 220) errors.push('Heart rate must be between 35 and 220 bpm');
  }
  if (data.fastingGlucose !== undefined && data.fastingGlucose !== null) {
    if (data.fastingGlucose < 40 || data.fastingGlucose > 500) errors.push('Fasting glucose must be between 40 and 500 mg/dL');
  }
  if (data.hba1c !== undefined && data.hba1c !== null) {
    if (data.hba1c < 3.0 || data.hba1c > 20.0) errors.push('HbA1c must be between 3.0% and 20.0%');
  }
  if (data.sleepHoursAvg !== undefined && data.sleepHoursAvg !== null) {
    if (data.sleepHoursAvg < 1 || data.sleepHoursAvg > 24) errors.push('Sleep hours must be between 1 and 24 hours');
  }
  return errors;
};

/**
 * Checks privacy permissions.
 * Allowed: Patient themselves, SUPER_ADMIN, or a Doctor/Staff with an ACTIVE consultation or admission.
 */
const checkAccessPermission = async (requester, targetPatientId) => {
  // 1. Patient viewing own profile
  if (requester.id === targetPatientId) {
    return true;
  }

  // 2. Super admin
  if (requester.role === 'SUPER_ADMIN') {
    return true;
  }

  // 3. Doctor access: active consultation or active assigned admission
  if (requester.role === 'DOCTOR') {
    const activeConsultation = await prisma.consultation.findFirst({
      where: {
        patientId: targetPatientId,
        doctorId: requester.id,
        status: { in: ['PENDING', 'ACTIVE'] }
      }
    });
    if (activeConsultation) return true;

    const activeAdmission = await prisma.admission.findFirst({
      where: {
        patientId: targetPatientId,
        assignedDoctorId: requester.id,
        stage: { not: 'DISCHARGED' }
      }
    });
    if (activeAdmission) return true;
  }

  // 4. Hospital staff: active admission at hospital
  if (requester.role === 'HOSPITAL_STAFF') {
    const activeAdmission = await prisma.admission.findFirst({
      where: {
        patientId: targetPatientId,
        stage: { not: 'DISCHARGED' }
      }
    });
    if (activeAdmission) return true;
  }

  return false;
};

/**
 * GET /api/health/profile
 * Retrieves health profile. Query ?patientId= can be used by authorized doctors/staff.
 */
exports.getProfile = async (req, res, next) => {
  try {
    const targetPatientId = req.query.patientId || req.user.id;

    const hasAccess = await checkAccessPermission(req.user, targetPatientId);
    if (!hasAccess) {
      return next(new AppError('Access denied. Active clinical relationship (consultation or admission) required to view patient health profile.', 403));
    }

    let profile = await prisma.healthProfile.findUnique({
      where: { patientId: targetPatientId },
      include: {
        patient: {
          select: { id: true, name: true, email: true, phone: true }
        }
      }
    });

    if (!profile) {
      // If patient viewing own profile for first time, return default blank template
      if (req.user.id === targetPatientId) {
        return res.json({
          status: 'success',
          data: {
            profile: null,
            completenessPercent: 0,
            dataConfidence: 'LOW',
            isSelfReported: true,
            message: 'No health profile created yet. Please complete your baseline profile.'
          }
        });
      }
      return next(new AppError('Patient health profile not found', 404));
    }

    const completeness = profile.completenessPercent || calculateCompleteness(profile);
    const dataConfidence = completeness >= 70 ? 'HIGH' : completeness >= 40 ? 'MODERATE' : 'LOW';

    res.json({
      status: 'success',
      data: {
        profile,
        completenessPercent: completeness,
        dataConfidence,
        isSelfReported: true
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/health/profile
 * Updates patient's own health profile.
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const patientId = req.user.id;

    if (req.user.role !== 'PATIENT') {
      return next(new AppError('Only the patient may enter or update self-reported health profile data.', 403));
    }

    const {
      dateOfBirth,
      sex,
      heightCm,
      weightKg,
      bloodGroup,
      restingBpSystolic,
      restingBpDiastolic,
      restingHeartRate,
      totalCholesterol,
      ldl,
      hdl,
      triglycerides,
      fastingGlucose,
      hba1c,
      smokingStatus,
      alcoholUse,
      activityLevel,
      sleepHoursAvg,
      familyHistoryHeartDisease,
      familyHistoryStroke,
      familyHistoryDiabetes,
      existingConditions,
      currentMedications,
      allergies,
      emergencyContact,
      consentToHealthMonitoring
    } = req.body;

    // Validate sane ranges
    const rangeErrors = validateRanges(req.body);
    if (rangeErrors.length > 0) {
      return next(new AppError(rangeErrors.join('; '), 400));
    }

    // Require explicit consent
    if (consentToHealthMonitoring === false) {
      return next(new AppError('Consent to local health monitoring is required to activate health tracking features.', 400));
    }

    // Compute BMI if height and weight present
    let bmi = null;
    if (heightCm && weightKg && heightCm > 0) {
      const heightM = heightCm / 100.0;
      bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));
    }

    const profileData = {
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      sex: sex || null,
      heightCm: heightCm !== undefined && heightCm !== '' ? parseFloat(heightCm) : null,
      weightKg: weightKg !== undefined && weightKg !== '' ? parseFloat(weightKg) : null,
      bmi,
      bloodGroup: bloodGroup || null,
      restingBpSystolic: restingBpSystolic !== undefined && restingBpSystolic !== '' ? parseInt(restingBpSystolic) : null,
      restingBpDiastolic: restingBpDiastolic !== undefined && restingBpDiastolic !== '' ? parseInt(restingBpDiastolic) : null,
      restingHeartRate: restingHeartRate !== undefined && restingHeartRate !== '' ? parseInt(restingHeartRate) : null,
      totalCholesterol: totalCholesterol !== undefined && totalCholesterol !== '' ? parseFloat(totalCholesterol) : null,
      ldl: ldl !== undefined && ldl !== '' ? parseFloat(ldl) : null,
      hdl: hdl !== undefined && hdl !== '' ? parseFloat(hdl) : null,
      triglycerides: triglycerides !== undefined && triglycerides !== '' ? parseFloat(triglycerides) : null,
      fastingGlucose: fastingGlucose !== undefined && fastingGlucose !== '' ? parseFloat(fastingGlucose) : null,
      hba1c: hba1c !== undefined && hba1c !== '' ? parseFloat(hba1c) : null,
      smokingStatus: smokingStatus || null,
      alcoholUse: alcoholUse || null,
      activityLevel: activityLevel || null,
      sleepHoursAvg: sleepHoursAvg !== undefined && sleepHoursAvg !== '' ? parseFloat(sleepHoursAvg) : null,
      familyHistoryHeartDisease: Boolean(familyHistoryHeartDisease),
      familyHistoryStroke: Boolean(familyHistoryStroke),
      familyHistoryDiabetes: Boolean(familyHistoryDiabetes),
      existingConditions: existingConditions || null,
      currentMedications: currentMedications || null,
      allergies: allergies || null,
      emergencyContact: typeof emergencyContact === 'object' && emergencyContact !== null ? JSON.stringify(emergencyContact) : (emergencyContact || null),
      consentToHealthMonitoring: consentToHealthMonitoring !== undefined ? Boolean(consentToHealthMonitoring) : true
    };

    const completeness = calculateCompleteness(profileData);
    profileData.completenessPercent = completeness;

    const profile = await prisma.healthProfile.upsert({
      where: { patientId },
      create: {
        patientId,
        ...profileData
      },
      update: profileData
    });

    const dataConfidence = completeness >= 70 ? 'HIGH' : completeness >= 40 ? 'MODERATE' : 'LOW';

    res.json({
      status: 'success',
      data: {
        profile,
        completenessPercent: completeness,
        dataConfidence,
        isSelfReported: true,
        message: 'Health profile updated successfully.'
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.calculateCompleteness = calculateCompleteness;
exports.validateRanges = validateRanges;

