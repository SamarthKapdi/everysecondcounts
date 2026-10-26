const request = require('supertest');
const { app } = require('../src/server');
const prisma = require('../src/config/prismaClient');
const jwt = require('jsonwebtoken');
const {
  calculateCompleteness,
  validateRanges
} = require('../src/controllers/healthProfileController');

describe('Profile Completeness & Access Control Unit & Integration Tests', () => {
  let patientUser;
  let patientToken;
  let unrelatedDoctorUser;
  let unrelatedDoctorToken;
  let treatingDoctorUser;
  let treatingDoctorToken;

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Patient
    patientUser = await prisma.user.create({
      data: {
        name: 'Profile Test Patient',
        email: `profile_pt_${timestamp}@esc.health`,
        passwordHash: 'dummy_hash',
        role: 'PATIENT',
        phone: '9800000002'
      }
    });
    patientToken = jwt.sign(
      { id: patientUser.id, email: patientUser.email, role: 'PATIENT', name: patientUser.name },
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_esc_2026',
      { expiresIn: '1h' }
    );

    // 2. Unrelated Doctor
    unrelatedDoctorUser = await prisma.user.create({
      data: {
        name: 'Dr. Unrelated',
        email: `doc_unrelated_${timestamp}@esc.health`,
        passwordHash: 'dummy_hash',
        role: 'DOCTOR',
        phone: '9800000003'
      }
    });
    unrelatedDoctorToken = jwt.sign(
      { id: unrelatedDoctorUser.id, email: unrelatedDoctorUser.email, role: 'DOCTOR', name: unrelatedDoctorUser.name },
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_esc_2026',
      { expiresIn: '1h' }
    );

    // 3. Treating Doctor (with consultation)
    treatingDoctorUser = await prisma.user.create({
      data: {
        name: 'Dr. Treating',
        email: `doc_treating_${timestamp}@esc.health`,
        passwordHash: 'dummy_hash',
        role: 'DOCTOR',
        phone: '9800000004'
      }
    });
    treatingDoctorToken = jwt.sign(
      { id: treatingDoctorUser.id, email: treatingDoctorUser.email, role: 'DOCTOR', name: treatingDoctorUser.name },
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_esc_2026',
      { expiresIn: '1h' }
    );

    // Link patient to treating doctor via Consultation
    await prisma.consultation.create({
      data: {
        patientId: patientUser.id,
        doctorId: treatingDoctorUser.id,
        patientName: patientUser.name,
        query: 'Follow up routine checkup',
        status: 'ACTIVE'
      }
    });
  });

  afterAll(async () => {
    if (patientUser) {
      await prisma.consultation.deleteMany({ where: { patientId: patientUser.id } });
      await prisma.dailyCheckin.deleteMany({ where: { patientId: patientUser.id } });
      await prisma.healthProfile.deleteMany({ where: { patientId: patientUser.id } });
      await prisma.riskAssessment.deleteMany({ where: { patientId: patientUser.id } });
      await prisma.user.deleteMany({
        where: { id: { in: [patientUser.id, unrelatedDoctorUser?.id, treatingDoctorUser?.id].filter(Boolean) } }
      });
    }
    await prisma.$disconnect();
  });

  describe('1. Missing-Data & Completeness Calculation', () => {
    test('calculates 0% completeness on empty input without throwing', () => {
      const completeness = calculateCompleteness({});
      expect(completeness).toBe(0);
    });

    test('calculates proportional completeness as fields are populated', () => {
      const partialData = {
        dateOfBirth: '1985-04-12',
        sex: 'MALE',
        heightCm: 175,
        weightKg: 78,
        bloodGroup: 'O_POSITIVE'
      };
      const partialCompleteness = calculateCompleteness(partialData);
      expect(partialCompleteness).toBeGreaterThanOrEqual(20);
      expect(partialCompleteness).toBeLessThan(50);

      const fullData = {
        ...partialData,
        restingBpSystolic: 120,
        restingBpDiastolic: 80,
        restingHeartRate: 72,
        totalCholesterol: 180,
        ldl: 100,
        hdl: 50,
        triglycerides: 150,
        fastingGlucose: 95,
        hba1c: 5.4,
        smokingStatus: 'NEVER',
        alcoholUse: 'NONE',
        activityLevel: 'MODERATE',
        sleepHoursAvg: 7,
        emergencyContact: { name: 'Kin', phone: '9999999999' },
        currentMedications: 'None'
      };
      const fullCompleteness = calculateCompleteness(fullData);
      expect(fullCompleteness).toBe(100);
    });

    test('validates clinical ranges and catches out-of-bounds parameters', () => {
      const invalidData = {
        heightCm: 320, // out of range
        weightKg: 10,  // out of range
        restingBpSystolic: 300,
        sleepHoursAvg: 30
      };
      const errors = validateRanges(invalidData);
      expect(errors.length).toBeGreaterThanOrEqual(4);
      expect(errors.some(e => e.includes('Height'))).toBe(true);
      expect(errors.some(e => e.includes('Weight'))).toBe(true);
      expect(errors.some(e => e.includes('Systolic'))).toBe(true);
      expect(errors.some(e => e.includes('Sleep'))).toBe(true);
    });
  });

  describe('2. Patient-Doctor Privacy & Clinical Relationship Gating', () => {
    beforeAll(async () => {
      // Create patient profile
      await prisma.healthProfile.upsert({
        where: { patientId: patientUser.id },
        create: {
          patientId: patientUser.id,
          dateOfBirth: new Date('1990-01-01'),
          sex: 'FEMALE',
          restingBpSystolic: 122,
          restingBpDiastolic: 78,
          restingHeartRate: 70,
          completenessPercent: 75
        },
        update: {}
      });
    });

    test('patient can access own health profile (200 OK)', async () => {
      const res = await request(app)
        .get('/api/health/profile')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.profile).toBeDefined();
      expect(res.body.data.profile.patientId).toBe(patientUser.id);
    });

    test('unrelated doctor receives 403 Forbidden on health profile', async () => {
      const res = await request(app)
        .get(`/api/health/profile?patientId=${patientUser.id}`)
        .set('Authorization', `Bearer ${unrelatedDoctorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Active clinical relationship.*required/i);
    });

    test('treating doctor with active consultation receives 200 OK on health profile', async () => {
      const res = await request(app)
        .get(`/api/health/profile?patientId=${patientUser.id}`)
        .set('Authorization', `Bearer ${treatingDoctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.profile.patientId).toBe(patientUser.id);
    });

    test('unrelated doctor receives 403 Forbidden on risk assessment', async () => {
      const res = await request(app)
        .get(`/api/risk/patient/${patientUser.id}`)
        .set('Authorization', `Bearer ${unrelatedDoctorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Active clinical relationship.*required/i);
    });

    test('treating doctor receives 200 OK on risk assessment', async () => {
      const res = await request(app)
        .get(`/api/risk/patient/${patientUser.id}`)
        .set('Authorization', `Bearer ${treatingDoctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });
});
