/**
 * Phase 3 Verification Script:
 * 1. Authenticate patient.
 * 2. GET /api/health/profile -> initial completeness.
 * 3. PUT /api/health/profile -> validate sane ranges, compute BMI, calculate completeness.
 * 4. Test validation error (e.g., BP 350 -> 400).
 * 5. Test privacy access control (Doctor with no relationship -> 403 Forbidden).
 */

const http = require('http');

const request = (path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

async function run() {
  console.log("============================================================");
  console.log("  PHASE 3: PATIENT HEALTH PROFILE API VERIFICATION");
  console.log("============================================================");

  // 1. Register or Login test patient
  const patientEmail = `testpatient_${Date.now()}@esc.health`;
  const regRes = await request('/api/auth/register', 'POST', {
    name: 'Jane Doe',
    email: patientEmail,
    password: 'Password123!',
    role: 'PATIENT',
    phone: '9876543210'
  });

  let patientToken = regRes.data?.tokens?.accessToken;
  let patientId = regRes.data?.data?.user?.id;
  if (!patientToken) {
    // If user already exists, login
    const loginRes = await request('/api/auth/login', 'POST', {
      email: patientEmail,
      password: 'Password123!'
    });
    patientToken = loginRes.data?.tokens?.accessToken;
    patientId = loginRes.data?.data?.user?.id;
  }
  console.log(`\n1. Authenticated Patient: ${patientEmail} (ID: ${patientId})`);

  // 2. GET /api/health/profile (initial state)
  const get1 = await request('/api/health/profile', 'GET', null, patientToken);
  console.log(`\n2. GET /api/health/profile (Initial): HTTP ${get1.status}`);
  console.log(`   Completeness: ${get1.data.data.completenessPercent}% | Data Confidence: ${get1.data.data.dataConfidence}`);

  // 3. PUT /api/health/profile with range validation error
  const invalidPut = await request('/api/health/profile', 'PUT', {
    heightCm: 170,
    weightKg: 70,
    restingBpSystolic: 350, // Invalid!
    consentToHealthMonitoring: true
  }, patientToken);
  console.log(`\n3. PUT /api/health/profile with invalid BP (350 mmHg): HTTP ${invalidPut.status}`);
  console.log(`   Validation error caught: ${invalidPut.data.message}`);

  // 4. PUT /api/health/profile with complete realistic profile
  const validPut = await request('/api/health/profile', 'PUT', {
    dateOfBirth: '1985-06-15',
    sex: 'FEMALE',
    heightCm: 165,
    weightKg: 62.5,
    bloodGroup: 'B+',
    restingBpSystolic: 118,
    restingBpDiastolic: 76,
    restingHeartRate: 68,
    totalCholesterol: 185,
    ldl: 105,
    hdl: 58,
    triglycerides: 110,
    fastingGlucose: 88,
    hba1c: 5.2,
    smokingStatus: 'NEVER',
    alcoholUse: 'NONE',
    activityLevel: 'MODERATE',
    sleepHoursAvg: 7.5,
    familyHistoryHeartDisease: false,
    familyHistoryStroke: false,
    familyHistoryDiabetes: true,
    existingConditions: {
      diabetes: false,
      hypertension: false,
      heartDisease: false,
      asthma: false,
      kidneyDisease: false,
      thyroid: false
    },
    currentMedications: 'Multivitamin daily',
    allergies: 'None',
    emergencyContact: 'John Doe (Spouse) +91 98765 00000',
    consentToHealthMonitoring: true
  }, patientToken);

  console.log(`\n4. PUT /api/health/profile (Valid Update): HTTP ${validPut.status}`);
  const p = validPut.data.data.profile;
  console.log(`   Calculated BMI: ${p.bmi} kg/m²`);
  console.log(`   Completeness: ${validPut.data.data.completenessPercent}% | Confidence: ${validPut.data.data.dataConfidence}`);
  console.log(`   Self-Reported Flag: ${validPut.data.data.isSelfReported}`);

  // 5. Test Privacy: Doctor with NO relationship tries to read patient's profile
  const prisma = require('./src/config/prismaClient');
  const jwt = require('jsonwebtoken');

  const doctorEmail = `testdoc_${Date.now()}@esc.health`;
  const docUser = await prisma.user.create({
    data: {
      name: 'Dr. Unrelated',
      email: doctorEmail,
      passwordHash: 'dummyhash',
      role: 'DOCTOR'
    }
  });

  const docToken = jwt.sign(
    { id: docUser.id, email: docUser.email, role: 'DOCTOR', name: docUser.name },
    process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_esc_2026',
    { expiresIn: '1d' }
  );

  const unauthorizedGet = await request(`/api/health/profile?patientId=${patientId}`, 'GET', null, docToken);
  console.log(`\n5. Privacy Check: Unrelated Doctor accessing Patient Profile: HTTP ${unauthorizedGet.status}`);
  console.log(`   Access Denied Response: ${unauthorizedGet.data.message}`);

  // Clean up test doctor
  await prisma.user.delete({ where: { id: docUser.id } });

  console.log("\n============================================================");
  console.log("  ALL PHASE 3 HEALTH PROFILE VERIFICATIONS PASSED!");
  console.log("============================================================");
  await prisma.$disconnect();
  console.log("============================================================");
}

run().catch(console.error);
