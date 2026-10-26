const prisma = require('../config/prismaClient');
const AppError = require('../utils/AppError');

/**
 * Returns current date string (YYYY-MM-DD), current hour (0-23), and full Date in Asia/Kolkata
 */
function getKolkataTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const partMap = {};
  parts.forEach(p => partMap[p.type] = p.value);
  const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const hour = parseInt(partMap.hour, 10);
  return { dateStr, hour, now };
}

/**
 * Returns active slot for given hour (Asia/Kolkata):
 * 05-12 -> MORNING
 * 12-17 -> AFTERNOON
 * 17-24 -> EVENING
 */
function getSlotForHour(hour) {
  if (hour >= 5 && hour < 12) return 'MORNING';
  if (hour >= 12 && hour < 17) return 'AFTERNOON';
  if (hour >= 17 && hour < 24) return 'EVENING';
  return null;
}

const SLOT_WINDOWS = {
  MORNING: { start: 5, end: 12, label: '05:00 - 12:00 IST' },
  AFTERNOON: { start: 12, end: 17, label: '12:00 - 17:00 IST' },
  EVENING: { start: 17, end: 24, label: '17:00 - 24:00 IST' }
};

/**
 * Evaluates red-flag emergency symptoms (deterministic rule override)
 */
function evaluateRedFlag(answers) {
  if (!answers) return false;
  if (answers.chestPain === 'at_rest' || answers.chestPain === 'radiating') return true;
  if (answers.breathlessness === 'severe') return true;
  if (answers.dizzinessFainting === 'fainting_syncope') return true;
  if (answers.headacheSeverity === 'thunderclap_severe') return true;
  if (answers.fastSigns && answers.fastSigns !== 'none') return true;
  return false;
}

/**
 * Computes symptom severity score (0 to 100)
 */
function computeSymptomScore(answers) {
  if (!answers) return 0;
  let score = 0;

  // Chest Pain
  if (answers.chestPain === 'radiating') score += 40;
  else if (answers.chestPain === 'at_rest') score += 35;
  else if (answers.chestPain === 'mild') score += 10;

  // Breathlessness
  if (answers.breathlessness === 'severe') score += 35;
  else if (answers.breathlessness === 'moderate') score += 18;
  else if (answers.breathlessness === 'mild_on_exertion') score += 8;

  // Palpitations
  if (answers.palpitations === 'irregular_skipped') score += 15;
  else if (answers.palpitations === 'rapid_fluttering') score += 12;
  else if (answers.palpitations === 'mild') score += 5;

  // Dizziness / Fainting
  if (answers.dizzinessFainting === 'fainting_syncope') score += 35;
  else if (answers.dizzinessFainting === 'mild_dizziness') score += 8;

  // Sweating
  if (answers.unusualSweating === 'profuse_cold_sweat') score += 18;
  else if (answers.unusualSweating === 'mild') score += 4;

  // Headache
  if (answers.headacheSeverity === 'thunderclap_severe') score += 35;
  else if (answers.headacheSeverity === 'moderate') score += 10;
  else if (answers.headacheSeverity === 'mild') score += 4;

  // FAST Signs
  if (answers.fastSigns === 'multiple') score += 45;
  else if (answers.fastSigns && answers.fastSigns !== 'none') score += 40;

  // Swelling
  if (answers.swellingFeet === 'both_feet_pitting') score += 14;
  else if (answers.swellingFeet === 'mild_evening') score += 5;

  // Fatigue
  if (answers.fatigue === 'exhausted') score += 10;
  else if (answers.fatigue === 'moderate') score += 5;

  // Stress & Sleep
  if (answers.stressLevel === 'extreme') score += 8;
  else if (answers.stressLevel === 'high') score += 5;

  if (answers.sleepQuality === 'insomnia') score += 8;
  else if (answers.sleepQuality === 'restless') score += 4;

  // Medication Adherence
  if (answers.medicationTaken === 'missed') score += 10;
  else if (answers.medicationTaken === 'partially') score += 5;

  return Math.min(100, Math.round(score));
}

/**
 * Calculates current check-in streak (consecutive days with at least 1 check-in)
 */
async function calculateStreak(patientId) {
  const checkins = await prisma.dailyCheckin.findMany({
    where: { patientId },
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'desc' },
    take: 60
  });

  if (checkins.length === 0) return 0;

  const { dateStr: today } = getKolkataTime();
  const dates = checkins.map(c => c.date);

  let streak = 0;
  let checkDate = new Date(today);

  // If today isn't checked in yet, streak could still continue from yesterday
  if (!dates.includes(today)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dStr = checkDate.toISOString().split('T')[0];
    if (dates.includes(dStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * GET /api/checkins/today
 * Returns slot status for today in Asia/Kolkata timezone:
 * morning (05-12), afternoon (12-17), evening (17-24).
 * Each slot is 'done', 'open', 'missed', or 'upcoming'.
 */
exports.getTodayStatus = async (req, res, next) => {
  try {
    const patientId = req.user.id;
    const { dateStr, hour } = getKolkataTime();

    // Support simulated slot / test query if not in production
    const testSlotOverride = process.env.NODE_ENV !== 'production' ? req.query.testSlotOverride : null;
    const activeSlot = testSlotOverride || getSlotForHour(hour);

    const todayCheckins = await prisma.dailyCheckin.findMany({
      where: {
        patientId,
        date: dateStr
      }
    });

    const checkinMap = {};
    todayCheckins.forEach(c => {
      checkinMap[c.slot] = c;
    });

    const getSlotState = (slotName, startH, endH) => {
      if (checkinMap[slotName]) {
        return { status: 'done', checkin: checkinMap[slotName], window: SLOT_WINDOWS[slotName].label };
      }
      if (testSlotOverride === slotName) {
        return { status: 'open', checkin: null, window: SLOT_WINDOWS[slotName].label };
      }
      if (hour >= startH && hour < endH) {
        return { status: 'open', checkin: null, window: SLOT_WINDOWS[slotName].label };
      }
      if (hour >= endH) {
        return { status: 'missed', checkin: null, window: SLOT_WINDOWS[slotName].label };
      }
      return { status: 'upcoming', checkin: null, window: SLOT_WINDOWS[slotName].label };
    };

    const slots = {
      MORNING: getSlotState('MORNING', 5, 12),
      AFTERNOON: getSlotState('AFTERNOON', 12, 17),
      EVENING: getSlotState('EVENING', 17, 24)
    };

    const streak = await calculateStreak(patientId);

    res.json({
      status: 'success',
      data: {
        date: dateStr,
        currentHour: hour,
        currentSlot: activeSlot,
        slots,
        streak,
        timezone: 'Asia/Kolkata (IST)'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/checkins
 * Submits daily checkin quiz for current slot.
 */
exports.submitCheckin = async (req, res, next) => {
  try {
    const patientId = req.user.id;
    const { answers, selfReportedVitals, slot: requestedSlot, testSlotOverride, testDateOverride } = req.body;

    if (!answers || typeof answers !== 'object') {
      return next(new AppError('Please complete quiz questions', 400));
    }

    const { dateStr: realDate, hour } = getKolkataTime();
    const effectiveDate = (process.env.NODE_ENV !== 'production' && testDateOverride) ? testDateOverride : realDate;

    // Slot determination & time window check
    const naturallyActiveSlot = getSlotForHour(hour);
    let effectiveSlot = naturallyActiveSlot;

    if (process.env.NODE_ENV !== 'production' && testSlotOverride) {
      effectiveSlot = testSlotOverride;
    } else if (requestedSlot) {
      effectiveSlot = requestedSlot;
    }

    if (!effectiveSlot) {
      return next(new AppError('Check-in slots are currently closed. Morning window opens at 05:00 IST.', 400));
    }

    // Verify requested slot matches active window unless test override allowed
    const isTestOverride = process.env.NODE_ENV !== 'production' && Boolean(testSlotOverride);
    if (!isTestOverride) {
      const window = SLOT_WINDOWS[effectiveSlot];
      if (!window || hour < window.start || hour >= window.end) {
        return next(new AppError(`The ${effectiveSlot} slot is not open right now. Accepted hours: ${window?.label || 'closed'}.`, 400));
      }
    }

    // Duplicate check
    const existing = await prisma.dailyCheckin.findUnique({
      where: {
        patientId_date_slot: {
          patientId,
          date: effectiveDate,
          slot: effectiveSlot
        }
      }
    });

    if (existing) {
      return next(new AppError(`You have already completed your ${effectiveSlot} check-in for ${effectiveDate}. Duplicate entries are not permitted.`, 409));
    }

    // Evaluate red flag and compute symptom score
    const redFlag = evaluateRedFlag(answers);
    let symptomScore = computeSymptomScore(answers);
    if (redFlag) {
      symptomScore = Math.max(symptomScore, 70);
    }

    const checkin = await prisma.dailyCheckin.create({
      data: {
        patientId,
        date: effectiveDate,
        slot: effectiveSlot,
        answers,
        selfReportedVitals: selfReportedVitals || null,
        symptomScore,
        redFlag
      }
    });

    // If redFlag is true, fetch nearby hospitals for instant emergency card
    let nearbyHospitals = [];
    if (redFlag) {
      nearbyHospitals = await prisma.hospital.findMany({
        where: { hasICU: true },
        take: 3,
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
          availableBeds: true
        }
      });
    }

    // Calculate updated streak
    const streak = await calculateStreak(patientId);

    // Socket.IO event emission for doctors/staff if red flag occurs
    const io = req.app.get('io');
    if (io && redFlag) {
      io.emit('emergency:redFlagCheckin', {
        patientId,
        patientName: req.user.name,
        date: effectiveDate,
        slot: effectiveSlot,
        symptomScore,
        message: 'Critical red-flag symptoms reported during daily check-in quiz.'
      });
    }

    res.status(201).json({
      status: 'success',
      data: {
        checkin,
        streak,
        redFlag,
        nearbyHospitals: redFlag ? nearbyHospitals : []
      }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new AppError('A check-in for this slot has already been recorded.', 409));
    }
    next(error);
  }
};

/**
 * GET /api/checkins/history?days=30
 * Retrieves past check-ins for patient.
 */
exports.getHistory = async (req, res, next) => {
  try {
    const patientId = req.query.patientId || req.user.id;
    const days = parseInt(req.query.days, 10) || 30;

    // Privacy check if querying another patient
    if (req.user.id !== patientId && req.user.role !== 'SUPER_ADMIN') {
      if (req.user.role === 'DOCTOR') {
        const hasConsultation = await prisma.consultation.findFirst({
          where: { patientId, doctorId: req.user.id, status: { in: ['PENDING', 'ACTIVE'] } }
        });
        const hasAdmission = await prisma.admission.findFirst({
          where: { patientId, assignedDoctorId: req.user.id, stage: { not: 'DISCHARGED' } }
        });
        if (!hasConsultation && !hasAdmission) {
          return next(new AppError('Access denied. Active clinical relationship required.', 403));
        }
      } else {
        return next(new AppError('Access denied.', 403));
      }
    }

    const checkins = await prisma.dailyCheckin.findMany({
      where: { patientId },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ],
      take: days * 3
    });

    const streak = await calculateStreak(patientId);

    res.json({
      status: 'success',
      results: checkins.length,
      data: {
        checkins,
        streak
      }
    });
  } catch (error) {
    next(error);
  }
};
