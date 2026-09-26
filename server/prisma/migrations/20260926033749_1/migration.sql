-- CreateEnum
CREATE TYPE "AdmissionStage" AS ENUM ('REGISTERED', 'TRIAGED', 'ADMITTED', 'IN_TREATMENT', 'UNDER_OBSERVATION', 'READY_FOR_DISCHARGE', 'DISCHARGED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'FULLY_PAID', 'WAIVED', 'INSURANCE_PROCESSING');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'APPEALED');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('ORDERED', 'SAMPLE_COLLECTED', 'IN_LAB', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG');

-- CreateEnum
CREATE TYPE "BloodRequestStatus" AS ENUM ('REQUESTED', 'MATCHED', 'FULFILLED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "OrganType" AS ENUM ('KIDNEY', 'LIVER', 'HEART', 'LUNG', 'PANCREAS', 'CORNEA', 'BONE_MARROW');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'MATCHED', 'TRANSPLANTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'CLOSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Hospital" ADD COLUMN     "address" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "patientName" TEXT NOT NULL,
    "doctorName" TEXT,
    "query" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admission" (
    "id" TEXT NOT NULL,
    "emergencyCaseId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "stage" "AdmissionStage" NOT NULL DEFAULT 'REGISTERED',
    "assignedDoctorId" TEXT,
    "admittedAt" TIMESTAMP(3),
    "dischargedAt" TIMESTAMP(3),
    "dischargeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Billing" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "itemizedCharges" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "coverageAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceClaim" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "billingId" TEXT NOT NULL,
    "claimAmount" DOUBLE PRECISION NOT NULL,
    "approvedAmount" DOUBLE PRECISION DEFAULT 0,
    "status" "ClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "claimDocuments" JSONB,
    "reviewerNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestOrder" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "orderedById" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "status" "TestStatus" NOT NULL DEFAULT 'ORDERED',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL,
    "testOrderId" TEXT NOT NULL,
    "resultData" JSONB,
    "reportFileUrl" TEXT,
    "extractedText" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodInventory" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL,
    "unitsAvailable" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BloodInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodRequest" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL,
    "unitsRequested" INTEGER NOT NULL,
    "status" "BloodRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedById" TEXT NOT NULL,
    "fulfilledAt" TIMESTAMP(3),
    "fulfilledFromHospitalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BloodRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donor" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "externalDonorName" TEXT,
    "bloodGroup" "BloodGroup" NOT NULL,
    "organType" "OrganType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransplantWaitlist" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organType" "OrganType" NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL,
    "urgencyScore" INTEGER NOT NULL,
    "waitingSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "matchedDonorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransplantWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundraisingCampaign" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "amountRaised" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundraisingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contributorName" TEXT,
    "userId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "contributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Consultation_patientId_idx" ON "Consultation"("patientId");

-- CreateIndex
CREATE INDEX "Consultation_doctorId_idx" ON "Consultation"("doctorId");

-- CreateIndex
CREATE INDEX "Consultation_status_idx" ON "Consultation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_emergencyCaseId_key" ON "Admission"("emergencyCaseId");

-- CreateIndex
CREATE INDEX "Admission_patientId_idx" ON "Admission"("patientId");

-- CreateIndex
CREATE INDEX "Admission_hospitalId_idx" ON "Admission"("hospitalId");

-- CreateIndex
CREATE INDEX "Admission_stage_idx" ON "Admission"("stage");

-- CreateIndex
CREATE INDEX "Admission_assignedDoctorId_idx" ON "Admission"("assignedDoctorId");

-- CreateIndex
CREATE UNIQUE INDEX "Billing_admissionId_key" ON "Billing"("admissionId");

-- CreateIndex
CREATE INDEX "Billing_status_idx" ON "Billing"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InsurancePolicy_policyNumber_key" ON "InsurancePolicy"("policyNumber");

-- CreateIndex
CREATE INDEX "InsurancePolicy_patientId_idx" ON "InsurancePolicy"("patientId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_policyNumber_idx" ON "InsurancePolicy"("policyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceClaim_billingId_key" ON "InsuranceClaim"("billingId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_policyId_idx" ON "InsuranceClaim"("policyId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_patientId_idx" ON "InsuranceClaim"("patientId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_hospitalId_idx" ON "InsuranceClaim"("hospitalId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_status_idx" ON "InsuranceClaim"("status");

-- CreateIndex
CREATE INDEX "TestOrder_admissionId_idx" ON "TestOrder"("admissionId");

-- CreateIndex
CREATE INDEX "TestOrder_orderedById_idx" ON "TestOrder"("orderedById");

-- CreateIndex
CREATE INDEX "TestOrder_status_idx" ON "TestOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TestResult_testOrderId_key" ON "TestResult"("testOrderId");

-- CreateIndex
CREATE INDEX "TestResult_testOrderId_idx" ON "TestResult"("testOrderId");

-- CreateIndex
CREATE INDEX "TestResult_reviewedById_idx" ON "TestResult"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "BloodInventory_hospitalId_bloodGroup_key" ON "BloodInventory"("hospitalId", "bloodGroup");

-- CreateIndex
CREATE INDEX "BloodRequest_admissionId_idx" ON "BloodRequest"("admissionId");

-- CreateIndex
CREATE INDEX "BloodRequest_bloodGroup_idx" ON "BloodRequest"("bloodGroup");

-- CreateIndex
CREATE INDEX "BloodRequest_status_idx" ON "BloodRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Donor_userId_key" ON "Donor"("userId");

-- CreateIndex
CREATE INDEX "Donor_bloodGroup_idx" ON "Donor"("bloodGroup");

-- CreateIndex
CREATE INDEX "Donor_organType_idx" ON "Donor"("organType");

-- CreateIndex
CREATE INDEX "TransplantWaitlist_patientId_idx" ON "TransplantWaitlist"("patientId");

-- CreateIndex
CREATE INDEX "TransplantWaitlist_organType_idx" ON "TransplantWaitlist"("organType");

-- CreateIndex
CREATE INDEX "TransplantWaitlist_bloodGroup_idx" ON "TransplantWaitlist"("bloodGroup");

-- CreateIndex
CREATE INDEX "TransplantWaitlist_status_idx" ON "TransplantWaitlist"("status");

-- CreateIndex
CREATE INDEX "FundraisingCampaign_patientId_idx" ON "FundraisingCampaign"("patientId");

-- CreateIndex
CREATE INDEX "FundraisingCampaign_status_idx" ON "FundraisingCampaign"("status");

-- CreateIndex
CREATE INDEX "Contribution_campaignId_idx" ON "Contribution"("campaignId");

-- CreateIndex
CREATE INDEX "Ambulance_status_idx" ON "Ambulance"("status");

-- CreateIndex
CREATE INDEX "DoctorNote_createdAt_idx" ON "DoctorNote"("createdAt");

-- CreateIndex
CREATE INDEX "Hospital_isActive_idx" ON "Hospital"("isActive");

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_emergencyCaseId_fkey" FOREIGN KEY ("emergencyCaseId") REFERENCES "EmergencyCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_assignedDoctorId_fkey" FOREIGN KEY ("assignedDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InsurancePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "Billing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestOrder" ADD CONSTRAINT "TestOrder_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestOrder" ADD CONSTRAINT "TestOrder_orderedById_fkey" FOREIGN KEY ("orderedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_testOrderId_fkey" FOREIGN KEY ("testOrderId") REFERENCES "TestOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodInventory" ADD CONSTRAINT "BloodInventory_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodRequest" ADD CONSTRAINT "BloodRequest_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodRequest" ADD CONSTRAINT "BloodRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodRequest" ADD CONSTRAINT "BloodRequest_fulfilledFromHospitalId_fkey" FOREIGN KEY ("fulfilledFromHospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donor" ADD CONSTRAINT "Donor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransplantWaitlist" ADD CONSTRAINT "TransplantWaitlist_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransplantWaitlist" ADD CONSTRAINT "TransplantWaitlist_matchedDonorId_fkey" FOREIGN KEY ("matchedDonorId") REFERENCES "Donor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundraisingCampaign" ADD CONSTRAINT "FundraisingCampaign_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundraisingCampaign" ADD CONSTRAINT "FundraisingCampaign_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FundraisingCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
