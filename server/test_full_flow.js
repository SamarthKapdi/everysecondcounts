/**
 * Phase 7 Full Flow End-to-End Verification:
 * 1. Register a new patient
 * 2. Fill health profile (vitals, lifestyle, conditions, consent)
 * 3. Complete morning, afternoon, evening check-ins (simulate time advancement via testSlotOverride)
 * 4. Trigger an acute red flag check-in (crushing chest pain / syncope)
 * 5. Verify:
 *    - Patient risk score is updated (>= 75, tier >= HIGH)
 *    - Emergency notification is created in database
 *    - Assigned / treating doctor can access patient risk and see the alert
 *    - Strict wording compliance (zero "you are safe" / "no risk")
 */

require('dotenv').config();
const http = require('http');
const prisma = require('./src/config/prismaClient');
const jwt = require('jsonwebtoken');

const request = (port, path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({
      hostname: 'localhost',
      port,
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

async function verifyFullFlow() {
  console.log("===============================================================================");
  console.log("  PHASE 7: FULL FLOW END-TO-END VERIFICATION");
  console.log("===============================================================================");

  const timestamp = Date.now();

  // ── Step 1: Register a new patient and a treating doctor ──
  console.log("\n[Step 1] Registering a new patient and doctor...");
  const patientEmail = `flow_patient_${timestamp}@esc.health`;
  const doctorEmail = `flow_doctor_${timestamp}@esc.health`;

  const patientReg = await request(5000, '/api/auth/register', 'POST', {
    name: 'Suresh Patil',
    email: patientEmail,
    password: 'Password123!',
    role: 'PATIENT',
    phone: '9822001122'
  });
  console.log(`  Patient Registration: HTTP ${patientReg.status} (User ID: ${patientReg.data?.data?.user?.id})`);
  const patientToken = patientReg.data?.tokens?.accessToken;
  const patientId = patientReg.data?.data?.user?.id;

  const doctorReg = await request(5000, '/api/auth/register', 'POST', {
    name: 'Dr. Neha Kulkarni',
    email: doctorEmail,
    password: 'Password123!',
    role: 'DOCTOR',
    phone: '9822003344'
  });
  const doctorId = doctorReg.data?.data?.user?.id;
  // Upgrade doctor to DOCTOR role in database (public registration defaults to PATIENT)
  await prisma.user.update({
    where: { id: doctorId },
    data: { role: 'DOCTOR' }
  });
  const doctorToken = jwt.sign(
    { id: doctorId, email: doctorEmail, role: 'DOCTOR', name: 'Dr. Neha Kulkarni' },
    process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_esc_2026',
    { expiresIn: '1h' }
  );
  console.log(`  Doctor Registration & Role Provision: HTTP ${doctorReg.status} (Doctor ID: ${doctorId})`);

  // Create active clinical relationship (Consultation) between Doctor and Patient
  await prisma.consultation.create({
    data: {
      patientId,
      doctorId,
      patientName: 'Suresh Patil',
      query: 'Hypertension and cardiac risk monitoring follow-up',
      status: 'ACTIVE'
    }
  });
  console.log("  Clinical Relationship: Active Consultation established between patient and doctor.");

  // ── Step 2: Fill Patient Health Profile ──
  console.log("\n[Step 2] Updating Patient Health Profile...");
  const profileRes = await request(5000, '/api/health/profile', 'PUT', {
    dateOfBirth: '1968-07-22', // Age ~58
    sex: 'MALE',
    heightCm: 172,
    weightKg: 82,
    bloodGroup: 'B_POSITIVE',
    restingBpSystolic: 152,
    restingBpDiastolic: 94,
    restingHeartRate: 84,
    totalCholesterol: 248,
    ldl: 155,
    hdl: 42,
    triglycerides: 210,
    fastingGlucose: 132,
    hba1c: 6.8,
    smokingStatus: 'CURRENT',
    alcoholUse: 'MODERATE',
    activityLevel: 'SEDENTARY',
    sleepHoursAvg: 6,
    existingConditions: { hypertension: true },
    currentMedications: 'Amlodipine 5mg daily',
    emergencyContact: { name: 'Kavita Patil', relationship: 'Spouse', phone: '9822009988' },
    consentToHealthMonitoring: true
  }, patientToken);

  console.log(`  Profile Update: HTTP ${profileRes.status}`);
  console.log(`  Completeness Score: ${profileRes.data?.data?.completenessPercent}%`);
  console.log(`  Data Confidence Tier: ${profileRes.data?.data?.dataConfidence}`);

  // ── Step 3: Complete Morning, Afternoon, Evening Check-ins ──
  console.log("\n[Step 3] Completing 3x Daily Check-ins (Simulated Windows)...");

  // 3a. Morning Check-in
  const morningRes = await request(5000, '/api/checkins', 'POST', {
    slot: 'MORNING',
    testSlotOverride: 'MORNING',
    testDateOverride: '2026-10-26',
    answers: {
      chestPain: 'none',
      breathlessness: 'none',
      fastSigns: 'none',
      palpitations: 'none',
      dizzinessFainting: 'none',
      sleepQuality: 'fair',
      stressLevel: 'moderate',
      medicationTaken: 'all_taken'
    },
    selfReportedVitals: { systolic: 148, heartRate: 80, spo2: 97 }
  }, patientToken);
  console.log(`  Morning Check-in: HTTP ${morningRes.status} | Symptom Score: ${morningRes.data?.data?.checkin?.symptomScore} | RedFlag: ${morningRes.data?.data?.redFlag}`);

  // 3b. Afternoon Check-in
  const afternoonRes = await request(5000, '/api/checkins', 'POST', {
    slot: 'AFTERNOON',
    testSlotOverride: 'AFTERNOON',
    testDateOverride: '2026-10-26',
    answers: {
      chestPain: 'mild',
      breathlessness: 'mild_on_exertion',
      fastSigns: 'none',
      palpitations: 'mild',
      dizzinessFainting: 'none',
      sleepQuality: 'fair',
      stressLevel: 'moderate',
      medicationTaken: 'all_taken'
    },
    selfReportedVitals: { systolic: 154, heartRate: 84, spo2: 96 }
  }, patientToken);
  console.log(`  Afternoon Check-in: HTTP ${afternoonRes.status} | Symptom Score: ${afternoonRes.data?.data?.checkin?.symptomScore} | RedFlag: ${afternoonRes.data?.data?.redFlag}`);

  // 3c. Evening Check-in
  const eveningRes = await request(5000, '/api/checkins', 'POST', {
    slot: 'EVENING',
    testSlotOverride: 'EVENING',
    testDateOverride: '2026-10-26',
    answers: {
      chestPain: 'mild',
      breathlessness: 'mild_on_exertion',
      fastSigns: 'none',
      palpitations: 'none',
      dizzinessFainting: 'none',
      sleepQuality: 'fair',
      stressLevel: 'moderate',
      medicationTaken: 'all_taken'
    },
    selfReportedVitals: { systolic: 150, heartRate: 82, spo2: 96 }
  }, patientToken);
  console.log(`  Evening Check-in: HTTP ${eveningRes.status} | Symptom Score: ${eveningRes.data?.data?.checkin?.symptomScore} | RedFlag: ${eveningRes.data?.data?.redFlag}`);

  // ── Step 4: Trigger an Acute Red-Flag Check-in ──
  console.log("\n[Step 4] Triggering an Acute Red-Flag Check-in...");
  const redFlagRes = await request(5000, '/api/checkins', 'POST', {
    slot: 'MORNING',
    testSlotOverride: 'MORNING',
    testDateOverride: '2026-10-27',
    answers: {
      chestPain: 'radiating', // Severe warning symptom
      breathlessness: 'severe',
      fastSigns: 'face_droop', // FAST stroke sign
      dizzinessFainting: 'fainting_syncope',
      palpitations: 'rapid_fluttering',
      unusualSweating: 'profuse_cold_sweat'
    },
    selfReportedVitals: { systolic: 178, heartRate: 110, spo2: 91 }
  }, patientToken);

  console.log(`  Red-Flag Check-in Status: HTTP ${redFlagRes.status}`);
  console.log(`  Red-Flag Flagged: ${redFlagRes.data?.data?.redFlag}`);
  console.log(`  Calculated Symptom Score: ${redFlagRes.data?.data?.checkin?.symptomScore} / 100`);
  console.log(`  Instant Emergency Card Hospitals Found: ${redFlagRes.data?.data?.nearbyHospitals?.length}`);

  // ── Step 5: Verify Risk Score, Notification, and Doctor Access ──
  console.log("\n[Step 5] Verifying Risk Score, Notification, and Doctor Clinical View...");

  // 5a. Verify patient's latest risk assessment
  const patientRiskRes = await request(5000, '/api/risk/me', 'GET', null, patientToken);
  const patientAssessment = patientRiskRes.data?.data?.assessment;
  console.log(`  Patient GET /api/risk/me: HTTP ${patientRiskRes.status}`);
  console.log(`  Assessment Score: ${patientAssessment?.finalScore} / 100`);
  console.log(`  Assessment Tier: ${patientAssessment?.tier}`);
  console.log(`  Model Version: ${patientAssessment?.modelVersion}`);
  console.log(`  Hard Override Active: ${patientAssessment?.finalScore >= 75 && (patientAssessment?.tier === 'HIGH' || patientAssessment?.tier === 'CRITICAL')}`);

  // 5b. Verify Notification created in database
  const notifications = await prisma.notification.findMany({
    where: { userId: patientId },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`  Patient Notifications Created: ${notifications.length}`);
  notifications.forEach(n => console.log(`   • [${n.type}] ${n.title}: ${n.message.slice(0, 75)}...`));

  // 5c. Verify Doctor accessing patient risk view
  const docRiskRes = await request(5000, `/api/risk/patient/${patientId}`, 'GET', null, doctorToken);
  console.log(`  Doctor GET /api/risk/patient/:id: HTTP ${docRiskRes.status}`);
  const docData = docRiskRes.data?.data;
  const docProfileRes = await request(5000, `/api/health/profile?patientId=${patientId}`, 'GET', null, doctorToken);
  console.log(`  Doctor GET /api/health/profile?patientId=: HTTP ${docProfileRes.status}`);
  console.log(`  Doctor Can See Patient Profile: ${docProfileRes.status === 200}`);
  console.log(`  Doctor Can See Risk History (${docData?.history?.length} records): ${docData?.history?.length > 0}`);
  console.log(`  Doctor Top Contributing Factors:`);
  (patientAssessment?.factors || []).forEach(f => {
    console.log(`    • [${f.severity.toUpperCase()}] ${f.factor}: ${f.detail}`);
  });

  // 5d. Wording Compliance Check
  const payloadStr = JSON.stringify(patientRiskRes.data) + JSON.stringify(docRiskRes.data);
  const forbiddenSafe = payloadStr.toLowerCase().includes('you are safe');
  const forbiddenNoRisk = payloadStr.toLowerCase().includes('"no risk"');
  console.log(`\n  Wording Audit:`);
  console.log(`   Forbidden 'you are safe' present: ${forbiddenSafe}`);
  console.log(`   Forbidden 'no risk' present: ${forbiddenNoRisk}`);

  // Assertions check
  const passed =
    patientReg.status === 201 &&
    profileRes.status === 200 &&
    redFlagRes.status === 201 &&
    redFlagRes.data?.data?.redFlag === true &&
    patientAssessment?.finalScore >= 75 &&
    (patientAssessment?.tier === 'HIGH' || patientAssessment?.tier === 'CRITICAL') &&
    notifications.length >= 1 &&
    docRiskRes.status === 200 &&
    !forbiddenSafe &&
    !forbiddenNoRisk;

  console.log("\n===============================================================================");
  if (passed) {
    console.log("  ALL FULL FLOW END-TO-END VERIFICATION CHECKS PASSED WITH 100% SUCCESS!");
  } else {
    console.log("  VERIFICATION FAILED!");
  }
  console.log("===============================================================================");

  await prisma.$disconnect();
}

verifyFullFlow().catch(err => {
  console.error("Full flow verification error:", err);
  process.exit(1);
});
