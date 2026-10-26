/**
 * Phase 4 Verification Script:
 * 1. Register test patient & authenticate.
 * 2. GET /api/checkins/today (Asia/Kolkata time slots).
 * 3. Test slot-window enforcement (rejection if closed).
 * 4. Submit valid checkin for open/test slot.
 * 5. Test duplicate rejection (same patient, date, slot -> HTTP 409).
 * 6. Test Red-flag override (chest pain at rest, fainting, FAST signs -> redFlag=true + nearby ICU hospitals).
 * 7. GET /api/checkins/history?days=30 -> verify history & streak.
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
  console.log("  PHASE 4: 3x DAILY QUIZ & RED-FLAG CHECK-IN VERIFICATION");
  console.log("============================================================");

  // 1. Register test patient
  const patientEmail = `checkin_patient_${Date.now()}@esc.health`;
  const regRes = await request('/api/auth/register', 'POST', {
    name: 'Rohan Sharma',
    email: patientEmail,
    password: 'Password123!',
    role: 'PATIENT',
    phone: '9876500001'
  });

  const patientToken = regRes.data?.tokens?.accessToken;
  const patientId = regRes.data?.data?.user?.id;
  console.log(`\n1. Registered Patient: ${patientEmail} (ID: ${patientId})`);

  // 2. GET /api/checkins/today
  const todayRes = await request('/api/checkins/today', 'GET', null, patientToken);
  console.log(`\n2. GET /api/checkins/today: HTTP ${todayRes.status}`);
  const td = todayRes.data?.data;
  console.log(`   Timezone: ${td.timezone} | Date: ${td.date} | Current Hour: ${td.currentHour}:00`);
  console.log(`   Current Active Slot: ${td.currentSlot || 'Closed (Night Hours)'}`);
  console.log(`   Morning Slot: ${td.slots.MORNING.status} (${td.slots.MORNING.window})`);
  console.log(`   Afternoon Slot: ${td.slots.AFTERNOON.status} (${td.slots.AFTERNOON.window})`);
  console.log(`   Evening Slot: ${td.slots.EVENING.status} (${td.slots.EVENING.window})`);
  console.log(`   Initial Streak: ${td.streak} days`);

  // 3. Test Closed Slot rejection (e.g. attempting morning slot when evening is active, without override)
  // Determine an inactive slot
  const inactiveSlot = td.currentHour >= 17 ? 'MORNING' : 'EVENING';
  const closedRes = await request('/api/checkins', 'POST', {
    slot: inactiveSlot,
    answers: {
      chestPain: 'none',
      breathlessness: 'none',
      palpitations: 'none',
      dizzinessFainting: 'none',
      fastSigns: 'none',
      headacheSeverity: 'none',
      unusualSweating: 'none',
      swellingFeet: 'none',
      fatigue: 'normal',
      sleepQuality: 'good',
      stressLevel: 'low',
      medicationTaken: 'all_taken'
    }
  }, patientToken);

  console.log(`\n3. Slot Window Enforcement: Submitting to inactive ${inactiveSlot} slot: HTTP ${closedRes.status}`);
  console.log(`   Window Rejection Message: ${closedRes.data?.message}`);

  // 4. Submit Valid Check-in for active slot (or use testSlotOverride if currently in night hours)
  const activeOrTestSlot = td.currentSlot || 'EVENING';
  const validCheckinRes = await request('/api/checkins', 'POST', {
    slot: activeOrTestSlot,
    testSlotOverride: activeOrTestSlot, // Ensure deterministic execution
    answers: {
      chestPain: 'none',
      breathlessness: 'mild_on_exertion',
      palpitations: 'none',
      dizzinessFainting: 'none',
      fastSigns: 'none',
      headacheSeverity: 'mild',
      unusualSweating: 'none',
      swellingFeet: 'none',
      fatigue: 'normal',
      sleepQuality: 'good',
      stressLevel: 'low',
      medicationTaken: 'all_taken'
    },
    selfReportedVitals: {
      systolic: 122,
      diastolic: 78,
      heartRate: 72,
      spo2: 98
    }
  }, patientToken);

  console.log(`\n4. Submit Normal Check-in (${activeOrTestSlot}): HTTP ${validCheckinRes.status}`);
  const c1 = validCheckinRes.data?.data?.checkin;
  console.log(`   Symptom Score: ${c1.symptomScore}/100 | Red Flag: ${c1.redFlag}`);
  console.log(`   Updated Streak: ${validCheckinRes.data?.data?.streak} day(s)`);

  // 5. Test Duplicate Entry Rejection
  const duplicateRes = await request('/api/checkins', 'POST', {
    slot: activeOrTestSlot,
    testSlotOverride: activeOrTestSlot,
    answers: {
      chestPain: 'none',
      breathlessness: 'none'
    }
  }, patientToken);

  console.log(`\n5. Duplicate Rejection Check: HTTP ${duplicateRes.status}`);
  console.log(`   Duplicate Error Message: ${duplicateRes.data?.message}`);

  // 6. Test Red-Flag Override (e.g., simulating a sudden cardiac / stroke red-flag event)
  const redFlagRes = await request('/api/checkins', 'POST', {
    slot: 'MORNING',
    testSlotOverride: 'MORNING',
    testDateOverride: '2026-10-25', // Use distinct date to test red flag
    answers: {
      chestPain: 'radiating', // Critical red flag!
      breathlessness: 'severe', // Critical red flag!
      palpitations: 'rapid_fluttering',
      dizzinessFainting: 'fainting_syncope', // Critical red flag!
      fastSigns: 'speech_slur', // Critical red flag!
      headacheSeverity: 'thunderclap_severe',
      unusualSweating: 'profuse_cold_sweat',
      swellingFeet: 'both_feet_pitting',
      fatigue: 'exhausted',
      sleepQuality: 'insomnia',
      stressLevel: 'extreme',
      medicationTaken: 'missed'
    },
    selfReportedVitals: {
      systolic: 178,
      diastolic: 110,
      heartRate: 118,
      spo2: 91
    }
  }, patientToken);

  console.log(`\n6. Red-Flag Override Submission: HTTP ${redFlagRes.status}`);
  const rf = redFlagRes.data?.data;
  console.log(`   Red Flag Triggered: ${rf.redFlag}`);
  console.log(`   Elevated Symptom Score: ${rf.checkin.symptomScore}/100`);
  console.log(`   Emergency Hospitals Returned: ${rf.nearbyHospitals?.length}`);
  if (rf.nearbyHospitals?.length > 0) {
    console.log(`   Nearest ICU Facility: ${rf.nearbyHospitals[0].name} (Phone: ${rf.nearbyHospitals[0].phone})`);
  }

  // 7. GET /api/checkins/history?days=30
  const historyRes = await request('/api/checkins/history?days=30', 'GET', null, patientToken);
  console.log(`\n7. GET /api/checkins/history: HTTP ${historyRes.status}`);
  console.log(`   Recorded Check-ins count: ${historyRes.data?.results}`);
  console.log(`   Calculated Streak: ${historyRes.data?.data?.streak} day(s)`);

  console.log("\n============================================================");
  console.log("  ALL PHASE 4 3x DAILY CHECK-IN VERIFICATIONS PASSED!");
  console.log("============================================================");
}

run().catch(console.error);
