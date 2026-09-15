/**
 * PulsePath AI — Smart Hospital Routing Engine
 * Ranks hospitals using a weighted multi-factor algorithm to find the optimal destination.
 * Factors: distance, bed availability, ICU support, specialty match, hospital load, trauma readiness.
 */

/**
 * Haversine formula to calculate distance between two lat/lng coordinates in km
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Estimate travel time in minutes (assumes avg 30km/h in urban emergency)
 */
const estimateETA = (distanceKm) => Math.round((distanceKm / 30) * 60);

/**
 * Severity-aware weight configuration
 * RED emergencies prioritize ICU/trauma capability and distance over everything.
 * GREEN emergencies can tolerate farther travel if it means less load.
 */
const getWeights = (severity) => {
  const weightProfiles = {
    RED: { distance: 0.35, beds: 0.10, icu: 0.25, specialty: 0.15, load: 0.05, trauma: 0.10 },
    ORANGE: { distance: 0.25, beds: 0.15, icu: 0.20, specialty: 0.20, load: 0.10, trauma: 0.10 },
    YELLOW: { distance: 0.20, beds: 0.20, icu: 0.10, specialty: 0.25, load: 0.15, trauma: 0.10 },
    GREEN: { distance: 0.15, beds: 0.25, icu: 0.05, specialty: 0.20, load: 0.30, trauma: 0.05 },
  };
  return weightProfiles[severity] || weightProfiles.YELLOW;
};

/**
 * Score a single hospital against an emergency
 * Returns a score between 0 and 100.
 */
const scoreHospital = (hospital, emergency, weights) => {
  const distance = haversineDistance(
    emergency.locationLat, emergency.locationLng,
    hospital.locationLat, hospital.locationLng
  );

  // Distance score: closer is better (max 50km range normalization)
  const distanceScore = Math.max(0, 100 - (distance / 50) * 100);

  // Bed availability score
  const bedScore = hospital.availableBeds > 0 ? Math.min(100, hospital.availableBeds * 10) : 0;

  // ICU support score (binary boosted by severity)
  const icuScore = hospital.hasICU ? 100 : 0;

  // Specialty match score
  const specialties = hospital.specialties || [];
  const emergencyKeywords = (emergency.symptoms || []).join(' ').toLowerCase();
  const specialtyMatches = specialties.filter(s =>
    emergencyKeywords.includes(s.toLowerCase()) ||
    s.toLowerCase().includes('emergency') ||
    s.toLowerCase().includes('trauma')
  ).length;
  const specialtyScore = specialties.length > 0 ? Math.min(100, (specialtyMatches / specialties.length) * 100 + 30) : 30;

  // Load score (lower load is better)
  const loadScore = Math.max(0, 100 - hospital.currentLoad);

  // Trauma readiness (boosted if hospital has trauma + ICU)
  const traumaScore = (hospital.hasICU && specialties.some(s => s.toLowerCase().includes('trauma'))) ? 100 : 40;

  const totalScore = (
    weights.distance * distanceScore +
    weights.beds * bedScore +
    weights.icu * icuScore +
    weights.specialty * specialtyScore +
    weights.load * loadScore +
    weights.trauma * traumaScore
  );

  return {
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    score: Math.round(totalScore * 100) / 100,
    distanceKm: Math.round(distance * 10) / 10,
    estimatedETA: estimateETA(distance),
    availableBeds: hospital.availableBeds,
    hasICU: hospital.hasICU,
    currentLoad: hospital.currentLoad,
    specialties: hospital.specialties,
    reasoning: generateReasoning(hospital, distance, weights, totalScore, emergency.severity),
  };
};

/**
 * Generate human-readable reasoning for WHY this hospital was recommended
 */
const generateReasoning = (hospital, distance, weights, score, severity) => {
  const reasons = [];

  if (distance < 5) reasons.push(`Very close proximity (${Math.round(distance * 10) / 10} km away)`);
  else if (distance < 15) reasons.push(`Moderate distance (${Math.round(distance * 10) / 10} km)`);
  else reasons.push(`${Math.round(distance * 10) / 10} km away — consider closer options if available`);

  if (hospital.availableBeds > 10) reasons.push(`Strong bed availability (${hospital.availableBeds} beds free)`);
  else if (hospital.availableBeds > 0) reasons.push(`Limited beds available (${hospital.availableBeds} remaining)`);
  else reasons.push('⚠ No beds currently available');

  if (hospital.hasICU && (severity === 'RED' || severity === 'ORANGE')) {
    reasons.push('ICU unit available — critical for this severity level');
  }

  if (hospital.currentLoad < 50) reasons.push('Low hospital load — fast admission likely');
  else if (hospital.currentLoad < 80) reasons.push('Moderate hospital load');
  else reasons.push('⚠ High hospital load — expect delays');

  return reasons.join('. ') + '.';
};

/**
 * Main routing function: rank all hospitals for an emergency
 */
const rankHospitals = (hospitals, emergency) => {
  const severity = emergency.severity || 'YELLOW';
  const weights = getWeights(severity);

  const scored = hospitals
    .filter(h => h.isActive !== false)
    .map(h => scoreHospital(h, emergency, weights))
    .sort((a, b) => b.score - a.score);

  return {
    recommended: scored[0] || null,
    alternatives: scored.slice(1, 4),
    allRanked: scored,
    routingMetadata: {
      severity,
      weightsUsed: weights,
      totalHospitalsEvaluated: scored.length,
      timestamp: new Date().toISOString(),
    },
  };
};

module.exports = { rankHospitals, haversineDistance, estimateETA };
