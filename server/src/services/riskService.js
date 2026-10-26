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

  // Hard red-flag override
  if (hasRecentRedFlag) {
    finalScore = Math.max(finalScore, 75.0);
  }

  let tier = 'LOW';
  if (finalScore >= 80) tier = 'CRITICAL';
  else if (finalScore >= 60 || hasRecentRedFlag) tier = 'HIGH';
  else if (finalScore >= 30) tier = 'MODERATE';

  const factors = [
    {
      factor: 'Estimated Baseline (Basic Mode)',
      severity: baseScore >= 40 ? 'high' : 'normal',
      detail: 'Computed using rule-based deterministic clinical guidelines while ML microservice is offline.'
    }
  ];

  if (hasRecentRedFlag) {
    factors.unshift({
      factor: 'Acute Red-Flag Symptom Flagged',
      severity: 'critical',
      detail: 'Emergency symptom reported during recent daily check-in (Hard override enforced).'
    });
  }

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
