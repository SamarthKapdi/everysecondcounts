const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PulsePath AI Database...');

  // Clear existing data (order matters for FK constraints)
  await prisma.consultation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.aIAnalysis.deleteMany();
  await prisma.doctorNote.deleteMany();
  await prisma.triageLog.deleteMany();
  await prisma.emergencyCase.deleteMany();
  await prisma.hospitalResource.deleteMany();
  await prisma.ambulance.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('pulsepath123', 12);

  // ── USERS ──────────────────────────────────────────────────────────
  const admin = await prisma.user.create({ data: { name: 'System Admin', email: 'admin@pulsepath.ai', passwordHash, role: 'SUPER_ADMIN', phone: '+91-99999-88888' } });
  const staff = await prisma.user.create({ data: { name: 'Hospital Staff', email: 'staff@pulsepath.ai', passwordHash, role: 'HOSPITAL_STAFF', phone: '+91-98888-11111' } });
  const doctor = await prisma.user.create({ data: { name: 'Dr. Rahul Mehta', email: 'doctor@pulsepath.ai', passwordHash, role: 'DOCTOR', phone: '+91-97777-22222' } });
  const doctor2 = await prisma.user.create({ data: { name: 'Dr. Priya Sharma', email: 'doctor2@pulsepath.ai', passwordHash, role: 'DOCTOR', phone: '+91-97777-33333' } });
  const driver1 = await prisma.user.create({ data: { name: 'Ravi Kumar', email: 'driver1@pulsepath.ai', passwordHash, role: 'AMBULANCE_DRIVER', phone: '+91-95555-11111' } });
  const driver2 = await prisma.user.create({ data: { name: 'Suresh Yadav', email: 'driver2@pulsepath.ai', passwordHash, role: 'AMBULANCE_DRIVER', phone: '+91-95555-22222' } });
  const patient = await prisma.user.create({ data: { name: 'Samarth Kapdi', email: 'patient@pulsepath.ai', passwordHash, role: 'PATIENT', phone: '+91-96666-33333' } });
  const patient2 = await prisma.user.create({ data: { name: 'Ashish Parihar', email: 'patient2@pulsepath.ai', passwordHash, role: 'PATIENT', phone: '+91-96666-44444' } });

  console.log('✅ Created 8 users');

  // ── HOSPITALS (Indore + nearby for realistic proximity) ─────────────
  const hospitals = await Promise.all([
    prisma.hospital.create({
      data: {
        name: 'Medanta Super Specialty Hospital',
        locationLat: 22.7196, locationLng: 75.8577,
        availableBeds: 28, hasICU: true, currentLoad: 42,
        specialties: ['Emergency Medicine', 'Cardiology', 'Neurology', 'Trauma Surgery'],
        phone: '+91-731-471-7777',
        address: 'AB Road, Near Bombay Hospital Square, Indore 452010',
      },
    }),
    prisma.hospital.create({
      data: {
        name: 'Bombay Hospital Indore',
        locationLat: 22.7235, locationLng: 75.8802,
        availableBeds: 35, hasICU: true, currentLoad: 55,
        specialties: ['General Medicine', 'Orthopedics', 'Pediatrics', 'Oncology'],
        phone: '+91-731-255-8866',
        address: 'Ring Road, Indore 452010',
      },
    }),
    prisma.hospital.create({
      data: {
        name: 'CHL Hospital Indore',
        locationLat: 22.7530, locationLng: 75.8937,
        availableBeds: 20, hasICU: true, currentLoad: 38,
        specialties: ['Cardiology', 'Gastroenterology', 'Nephrology', 'Pulmonology'],
        phone: '+91-731-254-2000',
        address: 'AB Road, LIG Square, Indore 452008',
      },
    }),
    prisma.hospital.create({
      data: {
        name: 'Choithram Hospital',
        locationLat: 22.7385, locationLng: 75.8430,
        availableBeds: 15, hasICU: true, currentLoad: 65,
        specialties: ['Emergency Medicine', 'Neurosurgery', 'Burns', 'Trauma Surgery'],
        phone: '+91-731-236-2491',
        address: 'Manik Bagh Road, Indore 452014',
      },
    }),
    prisma.hospital.create({
      data: {
        name: 'MY Hospital Indore',
        locationLat: 22.7146, locationLng: 75.8635,
        availableBeds: 40, hasICU: true, currentLoad: 72,
        specialties: ['General Medicine', 'Surgery', 'Obstetrics', 'ENT'],
        phone: '+91-731-252-7383',
        address: 'MY Hospital Road, Indore 452001',
      },
    }),
    prisma.hospital.create({
      data: {
        name: 'Apollo Rajshree Hospital',
        locationLat: 22.6870, locationLng: 75.8573,
        availableBeds: 22, hasICU: true, currentLoad: 48,
        specialties: ['Cardiology', 'Orthopedics', 'Urology', 'Dermatology'],
        phone: '+91-731-471-8888',
        address: 'Bypass Road, Indore 452005',
      },
    }),
  ]);

  console.log(`✅ Created ${hospitals.length} hospitals`);

  // ── HOSPITAL RESOURCES ─────────────────────────────────────────────
  await Promise.all([
    prisma.hospitalResource.create({ data: { hospitalId: hospitals[0].id, resourceType: 'VENTILATOR', quantity: 12 } }),
    prisma.hospitalResource.create({ data: { hospitalId: hospitals[0].id, resourceType: 'OXYGEN_CYLINDER', quantity: 30 } }),
    prisma.hospitalResource.create({ data: { hospitalId: hospitals[0].id, resourceType: 'DEFIBRILLATOR', quantity: 4 } }),
    prisma.hospitalResource.create({ data: { hospitalId: hospitals[1].id, resourceType: 'VENTILATOR', quantity: 8 } }),
    prisma.hospitalResource.create({ data: { hospitalId: hospitals[1].id, resourceType: 'BLOOD_BANK', quantity: 200 } }),
    prisma.hospitalResource.create({ data: { hospitalId: hospitals[4].id, resourceType: 'VENTILATOR', quantity: 15 } }),
    prisma.hospitalResource.create({ data: { hospitalId: hospitals[4].id, resourceType: 'OXYGEN_CYLINDER', quantity: 50 } }),
  ]);

  console.log('✅ Created hospital resources');

  // ── AMBULANCES (require driverId, no hospitalId in schema) ──────────
  const ambulances = await Promise.all([
    prisma.ambulance.create({ data: { vehicleNumber: 'MP-09-AE-1008', driverId: driver1.id, status: 'AVAILABLE', currentLat: 22.7196, currentLng: 75.8577 } }),
    prisma.ambulance.create({ data: { vehicleNumber: 'MP-09-AE-2045', driverId: driver2.id, status: 'AVAILABLE', currentLat: 22.7530, currentLng: 75.8937 } }),
  ]);

  console.log(`✅ Created ${ambulances.length} ambulances`);

  // ── DEMO EMERGENCY CASE ────────────────────────────────────────────
  const demoEmergency = await prisma.emergencyCase.create({
    data: {
      patientId: patient.id,
      hospitalId: hospitals[0].id,
      ambulanceId: ambulances[0].id,
      severity: 'RED',
      symptoms: ['chest pain', 'shortness of breath', 'dizziness'],
      aiConfidenceScore: 0.94,
      aiReasoning: 'Patient presents with classic cardiac event symptoms: chest pain, shortness of breath, and dizziness. Rule-based override triggered for chest pain. AI confidence: 94%.',
      recommendedAction: 'Dispatch ambulance immediately. Prepare cardiac catheterization lab. Administer aspirin and nitroglycerin on arrival.',
      locationLat: 19.0650,
      locationLng: 72.8700,
      status: 'DISPATCHED',
    },
  });

  // Create triage log for the demo emergency
  await prisma.triageLog.create({
    data: {
      emergencyId: demoEmergency.id,
      loggedById: doctor.id,
      actionTaken: 'AI Triage: RED severity. Confidence: 94%. Chest pain + shortness of breath + dizziness. Rule-based override active. Ambulance MH-01-AE-1008 dispatched to Apollo Emergency Hospital.',
    },
  });

  // Create a doctor note
  await prisma.doctorNote.create({
    data: {
      emergencyId: demoEmergency.id,
      doctorId: doctor.id,
      note: 'Patient triage assessed via PulsePath AI. Cardiac markers to be checked upon arrival. Cath lab placed on standby.',
    },
  });

  console.log('✅ Created demo emergency case with triage log and doctor note');

  // ── A SECOND (RESOLVED) EMERGENCY ──────────────────────────────────
  const resolvedEmergency = await prisma.emergencyCase.create({
    data: {
      patientId: patient2.id,
      hospitalId: hospitals[1].id,
      severity: 'YELLOW',
      symptoms: ['high fever', 'nausea', 'headache'],
      aiConfidenceScore: 0.82,
      aiReasoning: 'Moderate symptoms suggesting viral infection or food poisoning. No critical indicators.',
      recommendedAction: 'Schedule outpatient evaluation. Monitor for 24 hours. Hydration and antipyretics recommended.',
      locationLat: 19.0800,
      locationLng: 72.8650,
      status: 'RESOLVED',
      resolvedAt: new Date(),
    },
  });

  await prisma.triageLog.create({
    data: {
      emergencyId: resolvedEmergency.id,
      loggedById: doctor2.id,
      actionTaken: 'AI Triage: YELLOW severity. Confidence: 82%. High fever + nausea + headache. Patient evaluated and discharged with medication.',
    },
  });

  console.log('✅ Created resolved emergency case');

  console.log('\n🎉 PulsePath AI Database seeded successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Login Credentials:');
  console.log('  Admin:      admin@pulsepath.ai / pulsepath123');
  console.log('  Staff:      staff@pulsepath.ai / pulsepath123');
  console.log('  Doctor 1:   doctor@pulsepath.ai / pulsepath123');
  console.log('  Doctor 2:   doctor2@pulsepath.ai / pulsepath123');
  console.log('  Patient 1:  patient@pulsepath.ai / pulsepath123');
  console.log('  Patient 2:  patient2@pulsepath.ai / pulsepath123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
