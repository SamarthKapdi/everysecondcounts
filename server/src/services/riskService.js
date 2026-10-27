const prisma = require('../config/prismaClient');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

/**
 * Deterministic fallback scoring when ML service is offline.
 * Label: "estimated (basic mode)"
 */
function computeFallbackRisk(profile, checkins) {
  let baseScore = 20.0;
  if (profile) {
    if (profile.restingBpSystolic && profile.restingBpSystolic >= 140) baseScore += 18.0;
    if (profile.restingBpDiastolic && profile.restingBpDiastolic >= 90) baseScore += 8.0;
    if (profile.totalCholesterol && profile.totalCholesterol >= 240) baseScore += 12.0;
    if (profile.fastingGlucose && profile.fastingGlucose >= 126) baseScore += 12.0;
    if (profile.hba1c && profile.hba1c >= 6.5) baseScore += 12.0;
    if (profile.smokingStatus === 'CURRENT') baseScore += 14.0;
    if (profile.familyHistoryHeartDisease) baseScore += 8.0;
  }
  baseScore = Math.min(100.0, baseScore);

  let dynamicScore = 15.0;
  let hasRecentRedFlag = false;

  if (checkins && checkins.length > 0) {
    const scores = checkins.map(c => c.symptomScore || 0);
    const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    dynamicScore = meanScore * 1.2;
    hasRecentRedFlag = checkins.some(c => c.redFlag);
  }
  dynamicScore = Math.min(100.0, dynamicScore);

  let finalScore = Math.round(0.35 * baseScore + 0.65 * dynamicScore);
  const modelBlendScore = finalScore;
  const appliedFloors = [];

  // Hard red-flag override
  if (hasRecentRedFlag) {
    finalScore = Math.max(finalScore, 75.0);
    appliedFloors.push({ rule: 'Acute red-flag symptom', floor: 75.0 });
  }

  let tier = 'LOW';
  if (finalScore >= 75) tier = 'CRITICAL';
  else if (finalScore >= 60 || hasRecentRedFlag) tier = 'HIGH';
  else if (finalScore >= 30) tier = 'MODERATE';

  const factors = [];

  if (hasRecentRedFlag) {
    factors.push({
      factor: 'Acute Red-Flag Symptom Flagged',
      severity: 'high',
      detail: 'Emergency symptom reported during recent daily check-in (Hard safety override enforced).'
    });
  }

  // Blood pressure factor
  if (profile && profile.restingBpSystolic) {
    if (profile.restingBpSystolic >= 140 || (profile.restingBpDiastolic && profile.restingBpDiastolic >= 90)) {
      factors.push({
        factor: 'Elevated Blood Pressure (Hypertension)',
        severity: profile.restingBpSystolic >= 160 ? 'high' : 'moderate',
        detail: `Systolic BP recorded at ${profile.restingBpSystolic} mmHg (above clinical threshold).`
      });
    } else {
      factors.push({
        factor: 'Normal Blood Pressure',
        severity: 'low',
        detail: `Systolic BP recorded within normal range at ${profile.restingBpSystolic} mmHg.`
      });
    }
  }

  // Tobacco / Smoking factor
  if (profile && profile.smokingStatus === 'CURRENT') {
    factors.push({
      factor: 'Active Tobacco Smoking',
      severity: 'high',
      detail: 'Active smoking significantly accelerates vascular endothelial damage and plaque vulnerability.'
    });
  } else if (profile && profile.smokingStatus === 'NEVER') {
    factors.push({
      factor: 'Non-Smoker Profile',
      severity: 'low',
      detail: 'No tobacco-related cardiovascular risk amplification detected.'
    });
  }

  // Metabolic factor (Cholesterol / Glucose)
  if (profile && ((profile.totalCholesterol && profile.totalCholesterol >= 240) || (profile.fastingGlucose && profile.fastingGlucose >= 126))) {
    factors.push({
      factor: 'Metabolic & Lipid Elevation',
      severity: 'moderate',
      detail: 'Elevated serum cholesterol or fasting glucose contributes to long-term arterial stiffness.'
    });
  } else if (profile && profile.totalCholesterol && profile.totalCholesterol < 200) {
    factors.push({
      factor: 'Optimal Lipid Levels',
      severity: 'low',
      detail: `Serum total cholesterol measured at optimal levels (${profile.totalCholesterol} mg/dL).`
    });
  }

  // Symptom check-in trajectory
  if (checkins && checkins.length > 0) {
    const scores = checkins.map(c => c.symptomScore || 0);
    const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (meanScore >= 40) {
      factors.push({
        factor: 'High Self-Reported Symptom Burden',
        severity: 'high',
        detail: `Average symptom severity across recent check-ins is elevated at ${Math.round(meanScore)}/100.`
      });
    } else if (meanScore > 15) {
      factors.push({
        factor: 'Mild Symptom Fluctuations',
        severity: 'moderate',
        detail: `Recent check-in symptoms show minor intermittent activity (${Math.round(meanScore)}/100).`
      });
    } else {
      factors.push({
        factor: 'Low Symptom Burden',
        severity: 'low',
        detail: 'Recent daily check-ins demonstrate steady stability without acute distress.'
      });
    }
  } else {
    factors.push({
      factor: 'Limited Check-in History',
      severity: 'moderate',
      detail: 'No longitudinal check-in entries logged yet; completing 3x daily quiz refines calibration.'
    });
  }

  // Ensure baseline engine factor is included
  factors.push({
    factor: 'Deterministic Clinical Baseline',
    severity: baseScore >= 50 ? 'high' : baseScore >= 30 ? 'moderate' : 'low',
    detail: 'Score evaluated using deterministic clinical guidelines while ML microservice is offline.'
  });

  const action = tier === 'CRITICAL'
    ? 'CRITICAL ALERT: Seek immediate emergency medical care (112 / 108) or visit nearest ICU hospital.'
    : tier === 'HIGH'
    ? 'Urgent Review Advised: Contact your doctor or cardiologist within 24-48 hours.'
    : tier === 'MODERATE'
    ? 'Moderate Risk: Review vitals with your physician during routine follow-up.'
    : 'No elevated risk detected from the data you entered. Maintain healthy habits and check in daily.';

  return {
    baselineRisk: Math.round(baseScore),
    dynamicRisk: Math.round(dynamicScore),
    finalScore,
    modelBlendScore,
    appliedFloors,
    tier,
    factors,
    recommendedAction: action,
    modelVersion: 'v1.0-deterministic-fallback (estimated basic mode)',
    dataConfidence: 'LOW',
    isRuleOverride: hasRecentRedFlag,
    disclaimer: 'Decision-Support Disclaimer: Calculated in basic mode. Intended for screening only, not medical diagnosis.'
  };
}

/**
 * Recomputes risk assessment for a patient from profile + recent 14-day check-ins.
 * Persists result to RiskAssessment table in Prisma.
 */
async function recomputePatientRisk(patientId, io = null) {
  try {
    // 1. Fetch patient profile
    const profile = await prisma.healthProfile.findUnique({
      where: { patientId }
    });

    // 2. Fetch last 14 days of check-ins
    const checkins = await prisma.dailyCheckin.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: 42 // 3 checkins * 14 days
    });

    let riskOutput = null;

    // 3. Try Local ML Service
    try {
      const mlRes = await fetch(`${ML_SERVICE_URL}/predict-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: profile || {},
          checkins: checkins || []
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (mlRes.ok) {
        riskOutput = await mlRes.json();
      }
    } catch (mlErr) {
      console.warn('ML risk service unreachable, executing deterministic fallback:', mlErr.message);
    }

    // 4. Fallback if ML service failed
    if (!riskOutput) {
      riskOutput = computeFallbackRisk(profile, checkins);
    }

    // 5. Save to RiskAssessment in Prisma
    const assessment = await prisma.riskAssessment.create({
      data: {
        patientId,
        baselineRisk: riskOutput.baselineRisk,
        dynamicRisk: riskOutput.dynamicRisk,
        finalScore: riskOutput.finalScore,
        tier: riskOutput.tier,
        factors: riskOutput.factors,
        appliedFloors: riskOutput.appliedFloors || [],
        recommendedAction: riskOutput.recommendedAction,
        modelVersion: riskOutput.modelVersion,
        dataConfidence: riskOutput.dataConfidence
      }
    });

    // 6. If tier is HIGH or CRITICAL, alert patient & clinical staff
    if (riskOutput.tier === 'HIGH' || riskOutput.tier === 'CRITICAL') {
      // In-app notification for patient
      await prisma.notification.create({
        data: {
          userId: patientId,
          title: `Health Warning: ${riskOutput.tier} Risk Tier`,
          message: riskOutput.recommendedAction,
          type: 'ALERT'
        }
      });

      // Socket.IO event emission
      if (io) {
        io.emit('risk:alert', {
          patientId,
          tier: riskOutput.tier,
          finalScore: riskOutput.finalScore,
          recommendedAction: riskOutput.recommendedAction,
          factors: riskOutput.factors,
          timestamp: new Date().toISOString()
        });
      }
    }

    return assessment;
  } catch (error) {
    console.error('Error in recomputePatientRisk:', error.message);
    throw error;
  }
}

module.exports = {
  recomputePatientRisk,
  computeFallbackRisk
};
