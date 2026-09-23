// Transplant Matching Algorithm

/**
 * Calculates a match score between a waitlist patient and a donor
 * @param {Object} waitlist Patient waitlist record
 * @param {Object} donor Potential donor
 * @returns {Number} Score (higher is better) or -1 if incompatible
 */
exports.calculateMatchScore = (waitlist, donor) => {
  // 1. Organ type MUST match
  if (waitlist.organType !== donor.organType) return -1;

  // 2. Blood group compatibility check (ABO Rules)
  // O can give to anyone; AB can receive from anyone; A to A/AB; B to B/AB
  // For simplicity in this demo, let's enforce EXACT match for score, but allow compatible
  // Actually let's just do a simplified check:
  const isCompatible = checkBloodCompatibility(donor.bloodGroup, waitlist.bloodGroup);
  if (!isCompatible) return -1;

  let score = 0;

  // Exact blood match gets higher score
  if (waitlist.bloodGroup === donor.bloodGroup) {
    score += 50;
  } else {
    score += 20; // Compatible but not exact
  }

  // 3. Urgency Score (1-10) -> adds up to 30 points
  score += (waitlist.urgencyScore * 3);

  // 4. Time on Waitlist -> up to 20 points
  // 1 point for every 30 days on waitlist, max 20 points
  const daysWaiting = (new Date() - new Date(waitlist.waitingSince)) / (1000 * 60 * 60 * 24);
  const timeScore = Math.min(20, Math.floor(daysWaiting / 30));
  score += timeScore;

  return score;
};

function checkBloodCompatibility(donorBg, recipientBg) {
  // Strip Rh factor for this simplified demo or handle it
  // Actually let's use a basic matrix (simplified)
  const compatibleMatrix = {
    'O_NEG': ['O_NEG', 'O_POS', 'A_NEG', 'A_POS', 'B_NEG', 'B_POS', 'AB_NEG', 'AB_POS'],
    'O_POS': ['O_POS', 'A_POS', 'B_POS', 'AB_POS'],
    'A_NEG': ['A_NEG', 'A_POS', 'AB_NEG', 'AB_POS'],
    'A_POS': ['A_POS', 'AB_POS'],
    'B_NEG': ['B_NEG', 'B_POS', 'AB_NEG', 'AB_POS'],
    'B_POS': ['B_POS', 'AB_POS'],
    'AB_NEG': ['AB_NEG', 'AB_POS'],
    'AB_POS': ['AB_POS']
  };
  
  return compatibleMatrix[donorBg]?.includes(recipientBg) || false;
}
