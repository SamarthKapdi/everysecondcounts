const request = require('supertest');
const { app } = require('../src/server');
const prisma = require('../src/config/prismaClient');
const jwt = require('jsonwebtoken');
const {
  getSlotForHour,
  evaluateRedFlag,
  computeSymptomScore
} = require('../src/controllers/checkinController');

describe('Check-in System Unit & Integration Tests', () => {
  let patientUser;
  let patientToken;

  beforeAll(async () => {
    // Create dedicated test patient
    const testEmail = `checkin_test_${Date.now()}@esc.health`;
    patientUser = await prisma.user.create({
      data: {
        name: 'Checkin Test Patient',
        email: testEmail,
        passwordHash: 'dummy_hash',
        role: 'PATIENT',
        phone: '9800000001'
      }
    });

    patientToken = jwt.sign(
      { id: patientUser.id, email: patientUser.email, role: 'PATIENT', name: patientUser.name },
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_esc_2026',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    if (patientUser) {
      await prisma.dailyCheckin.deleteMany({ where: { patientId: patientUser.id } });
      await prisma.healthProfile.deleteMany({ where: { patientId: patientUser.id } });
      await prisma.riskAssessment.deleteMany({ where: { patientId: patientUser.id } });
      await prisma.notification.deleteMany({ where: { userId: patientUser.id } });
      await prisma.user.delete({ where: { id: patientUser.id } });
    }
    await prisma.$disconnect();
  });

  describe('1. Slot-Window Enforcement (Asia/Kolkata)', () => {
    test('getSlotForHour correctly assigns slots across the 24-hour cycle', () => {
      // 05:00 to 11:59 is MORNING
      expect(getSlotForHour(5)).toBe('MORNING');
      expect(getSlotForHour(8)).toBe('MORNING');
      expect(getSlotForHour(11)).toBe('MORNING');

      // 12:00 to 16:59 is AFTERNOON
      expect(getSlotForHour(12)).toBe('AFTERNOON');
      expect(getSlotForHour(14)).toBe('AFTERNOON');
      expect(getSlotForHour(16)).toBe('AFTERNOON');

      // 17:00 to 23:59 is EVENING
      expect(getSlotForHour(17)).toBe('EVENING');
      expect(getSlotForHour(20)).toBe('EVENING');
      expect(getSlotForHour(23)).toBe('EVENING');

      // 00:00 to 04:59 is off-window (null)
      expect(getSlotForHour(0)).toBeNull();
      expect(getSlotForHour(2)).toBeNull();
      expect(getSlotForHour(4)).toBeNull();
    });

    test('rejects check-in if submitted for inactive slot without test override', async () => {
      // Use impossible slot mismatch
      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          slot: 'SLOT_INVALID_TEST',
          answers: { chestPain: 'none' }
        });

      expect([400, 422]).toContain(res.status);
    });
  });

  describe('2. Red-Flag Symptom Rule Override', () => {
    test('detects red-flag emergency symptoms accurately', () => {
      // Chest pain
      expect(evaluateRedFlag({ chestPain: 'radiating' })).toBe(true);
      expect(evaluateRedFlag({ chestPain: 'at_rest' })).toBe(true);
      expect(evaluateRedFlag({ chestPain: 'mild' })).toBe(false);

      // Breathlessness
      expect(evaluateRedFlag({ breathlessness: 'severe' })).toBe(true);
      expect(evaluateRedFlag({ breathlessness: 'moderate' })).toBe(false);

      // FAST stroke signs
      expect(evaluateRedFlag({ fastSigns: 'face_droop' })).toBe(true);
      expect(evaluateRedFlag({ fastSigns: 'arm_weakness' })).toBe(true);
      expect(evaluateRedFlag({ fastSigns: 'none' })).toBe(false);

      // Thunderclap headache and syncope
      expect(evaluateRedFlag({ headacheSeverity: 'thunderclap_severe' })).toBe(true);
      expect(evaluateRedFlag({ dizzinessFainting: 'fainting_syncope' })).toBe(true);

      // Completely benign
      expect(evaluateRedFlag({
        chestPain: 'none',
        breathlessness: 'none',
        fastSigns: 'none',
        dizzinessFainting: 'none'
      })).toBe(false);
    });

    test('computes symptom score and forces redFlag flag in database', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          slot: 'MORNING',
          testSlotOverride: 'MORNING',
          answers: {
            chestPain: 'radiating',
            breathlessness: 'severe',
            fastSigns: 'face_droop'
          }
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.data.redFlag).toBe(true);
      expect(res.body.data.checkin.redFlag).toBe(true);
      expect(res.body.data.checkin.symptomScore).toBeGreaterThanOrEqual(50);
      expect(res.body.data.nearbyHospitals).toBeDefined();
    });
  });

  describe('3. Duplicate Check-in Rejection (409 Conflict)', () => {
    test('rejects duplicate check-in for the same slot on the same day with 409', async () => {
      // First attempt for AFTERNOON slot
      const firstRes = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          slot: 'AFTERNOON',
          testSlotOverride: 'AFTERNOON',
          answers: {
            chestPain: 'none',
            breathlessness: 'none',
            fastSigns: 'none'
          }
        });

      expect([200, 201]).toContain(firstRes.status);

      // Duplicate attempt for same slot today
      const dupRes = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          slot: 'AFTERNOON',
          testSlotOverride: 'AFTERNOON',
          answers: {
            chestPain: 'none',
            breathlessness: 'none',
            fastSigns: 'none'
          }
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.message).toMatch(/already completed|already recorded/i);
    });
  });

  describe('4. Consent Gating', () => {
    test('rejects check-in when consent is explicitly withheld/revoked', async () => {
      // Set patient profile consent to false
      await prisma.healthProfile.upsert({
        where: { patientId: patientUser.id },
        create: {
          patientId: patientUser.id,
          consentToHealthMonitoring: false,
          completenessPercent: 20
        },
        update: {
          consentToHealthMonitoring: false
        }
      });

      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          slot: 'EVENING',
          testSlotOverride: 'EVENING',
          consentGiven: false,
          answers: { chestPain: 'none' }
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/consent/i);

      // Re-enable consent for cleanup
      await prisma.healthProfile.update({
        where: { patientId: patientUser.id },
        data: { consentToHealthMonitoring: true }
      });
    });
  });
});
