const { computeFallbackRisk } = require('../src/services/riskService');

describe('Deterministic Risk Engine Fallback Tests', () => {
  test('returns labeled fallback model response with valid score bounds [0, 100]', () => {
    const profile = {
      restingBpSystolic: 120,
      restingBpDiastolic: 80,
      restingHeartRate: 72,
      totalCholesterol: 180,
      smokingStatus: 'NEVER'
    };
    const checkins = [
      { symptomScore: 10, redFlag: false }
    ];

    const result = computeFallbackRisk(profile, checkins);

    expect(result).toBeDefined();
    expect(result.modelVersion).toContain('estimated basic mode');
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.finalScore).toBeLessThanOrEqual(100);
    expect(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).toContain(result.tier);
    expect(result.factors.length).toBeGreaterThanOrEqual(3);

    // Each factor must have factor, severity, and detail
    result.factors.forEach(f => {
      expect(f.factor).toBeDefined();
      expect(['low', 'moderate', 'high']).toContain(f.severity);
      expect(f.detail).toBeDefined();
    });
  });

  test('escalates risk score and factors for hypertensive smoker with high symptom score', () => {
    const profile = {
      restingBpSystolic: 165,
      restingBpDiastolic: 102,
      restingHeartRate: 95,
      totalCholesterol: 260,
      smokingStatus: 'CURRENT',
      existingConditions: { hypertension: true, heartDisease: true }
    };
    const checkins = [
      { symptomScore: 55, redFlag: false }
    ];

    const result = computeFallbackRisk(profile, checkins);

    expect(result.finalScore).toBeGreaterThanOrEqual(50);
    expect(['MODERATE', 'HIGH', 'CRITICAL']).toContain(result.tier);
    expect(result.factors.some(f => f.factor.includes('Blood Pressure') || f.factor.includes('Hypertension'))).toBe(true);
    expect(result.factors.some(f => f.factor.includes('Tobacco'))).toBe(true);
  });

  test('hard safety override triggers when checkin has redFlag=true', () => {
    const youngHealthyProfile = {
      dateOfBirth: '2000-01-01',
      restingBpSystolic: 110,
      restingBpDiastolic: 70,
      totalCholesterol: 150,
      smokingStatus: 'NEVER'
    };
    const redFlagCheckins = [
      { symptomScore: 15, redFlag: false },
      { symptomScore: 80, redFlag: true }
    ];

    const result = computeFallbackRisk(youngHealthyProfile, redFlagCheckins);

    expect(result.isRuleOverride).toBe(true);
    expect(result.finalScore).toBeGreaterThanOrEqual(75);
    expect(result.appliedFloors).toContainEqual({
      rule: 'Acute red-flag symptom',
      floor: 75
    });
    expect(['HIGH', 'CRITICAL']).toContain(result.tier);
    expect(result.factors.some(f => f.severity === 'high')).toBe(true);
  });

  test('fallback preserves applied safety floors for a red flag', () => {
    const result = computeFallbackRisk(
      { restingBpSystolic: 120, restingBpDiastolic: 80, smokingStatus: 'NEVER' },
      [{ symptomScore: 90, redFlag: true }]
    );

    expect(result.appliedFloors).toEqual([
      { rule: 'Acute red-flag symptom', floor: 75 }
    ]);
    expect(result.finalScore).toBeGreaterThanOrEqual(result.appliedFloors[0].floor);
  });

  test('strictly adheres to wording rules: never outputs "you are safe" or "no risk"', () => {
    const lowRiskProfile = {
      restingBpSystolic: 115,
      restingHeartRate: 68,
      smokingStatus: 'NEVER'
    };
    const result = computeFallbackRisk(lowRiskProfile, []);

    const stringified = JSON.stringify(result).toLowerCase();
    expect(stringified).not.toContain('you are safe');
    expect(stringified).not.toContain('"no risk"');
  });
});
