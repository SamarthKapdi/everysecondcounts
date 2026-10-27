-- CreateEnum
CREATE TYPE "CheckinSlot" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateTable
CREATE TABLE "HealthProfile" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "sex" TEXT,
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bloodGroup" TEXT,
    "restingBpSystolic" INTEGER,
    "restingBpDiastolic" INTEGER,
    "restingHeartRate" INTEGER,
    "totalCholesterol" DOUBLE PRECISION,
    "ldl" DOUBLE PRECISION,
    "hdl" DOUBLE PRECISION,
    "triglycerides" DOUBLE PRECISION,
    "fastingGlucose" DOUBLE PRECISION,
    "hba1c" DOUBLE PRECISION,
    "smokingStatus" TEXT,
    "alcoholUse" TEXT,
    "activityLevel" TEXT,
    "sleepHoursAvg" DOUBLE PRECISION,
    "familyHistoryHeartDisease" BOOLEAN NOT NULL DEFAULT false,
    "familyHistoryStroke" BOOLEAN NOT NULL DEFAULT false,
    "familyHistoryDiabetes" BOOLEAN NOT NULL DEFAULT false,
    "existingConditions" JSONB,
    "currentMedications" TEXT,
    "allergies" TEXT,
    "emergencyContact" TEXT,
    "consentToHealthMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "completenessPercent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCheckin" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "slot" "CheckinSlot" NOT NULL,
    "answers" JSONB NOT NULL,
    "selfReportedVitals" JSONB,
    "symptomScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "redFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "baselineRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dynamicRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'LOW',
    "factors" JSONB,
    "recommendedAction" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT 'v1.0-local',
    "dataConfidence" TEXT NOT NULL DEFAULT 'HIGH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthProfile_patientId_key" ON "HealthProfile"("patientId");

-- CreateIndex
CREATE INDEX "HealthProfile_patientId_idx" ON "HealthProfile"("patientId");

-- CreateIndex
CREATE INDEX "DailyCheckin_patientId_idx" ON "DailyCheckin"("patientId");

-- CreateIndex
CREATE INDEX "DailyCheckin_date_idx" ON "DailyCheckin"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheckin_patientId_date_slot_key" ON "DailyCheckin"("patientId", "date", "slot");

-- CreateIndex
CREATE INDEX "RiskAssessment_patientId_idx" ON "RiskAssessment"("patientId");

-- CreateIndex
CREATE INDEX "RiskAssessment_createdAt_idx" ON "RiskAssessment"("createdAt");

-- AddForeignKey
ALTER TABLE "HealthProfile" ADD CONSTRAINT "HealthProfile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCheckin" ADD CONSTRAINT "DailyCheckin_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

