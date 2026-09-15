/**
 * Frontend AI Symptom Analyzer — mirrors backend logic for offline mode
 */
const symptomConditionMap = {
  'chest pain': { conditions: ['Heart Attack', 'Angina', 'Pulmonary Embolism'], weight: 9, category: 'cardiac' },
  'shortness of breath': { conditions: ['Asthma', 'COPD', 'Heart Failure', 'Pneumonia'], weight: 8, category: 'respiratory' },
  'severe headache': { conditions: ['Migraine', 'Stroke', 'Meningitis'], weight: 7, category: 'neurological' },
  'high fever': { conditions: ['Infection', 'Sepsis', 'Malaria', 'COVID-19'], weight: 6, category: 'infectious' },
  'difficulty breathing': { conditions: ['Asthma Attack', 'Anaphylaxis', 'Pneumothorax'], weight: 9, category: 'respiratory' },
  'numbness': { conditions: ['Stroke', 'Multiple Sclerosis', 'Diabetic Neuropathy'], weight: 7, category: 'neurological' },
  'dizziness': { conditions: ['Vertigo', 'Low Blood Pressure', 'Anemia'], weight: 5, category: 'neurological' },
  'abdominal pain': { conditions: ['Appendicitis', 'Gastritis', 'Pancreatitis'], weight: 6, category: 'gastrointestinal' },
  'vomiting': { conditions: ['Food Poisoning', 'Gastroenteritis', 'Bowel Obstruction'], weight: 4, category: 'gastrointestinal' },
  'bleeding': { conditions: ['Trauma', 'Internal Hemorrhage', 'Ulcer'], weight: 8, category: 'trauma' },
  'unconsciousness': { conditions: ['Stroke', 'Cardiac Arrest', 'Seizure'], weight: 10, category: 'critical' },
  'seizures': { conditions: ['Epilepsy', 'Brain Tumor', 'Meningitis'], weight: 9, category: 'neurological' },
  'blurred vision': { conditions: ['Stroke', 'Diabetic Retinopathy', 'Glaucoma'], weight: 6, category: 'neurological' },
  'rapid heartbeat': { conditions: ['Arrhythmia', 'Panic Attack', 'Hyperthyroidism'], weight: 7, category: 'cardiac' },
  'confusion': { conditions: ['Stroke', 'Hypoglycemia', 'Concussion'], weight: 8, category: 'neurological' },
  'cough': { conditions: ['Bronchitis', 'Pneumonia', 'COVID-19'], weight: 3, category: 'respiratory' },
  'fatigue': { conditions: ['Anemia', 'Hypothyroidism', 'Depression'], weight: 2, category: 'general' },
  'nausea': { conditions: ['Gastritis', 'Concussion', 'Food Poisoning'], weight: 3, category: 'gastrointestinal' },
  'back pain': { conditions: ['Herniated Disc', 'Kidney Infection', 'Spinal Stenosis'], weight: 4, category: 'musculoskeletal' },
  'joint pain': { conditions: ['Arthritis', 'Gout', 'Lupus'], weight: 3, category: 'musculoskeletal' },
  'skin rash': { conditions: ['Allergic Reaction', 'Eczema', 'Measles'], weight: 3, category: 'dermatological' },
  'sore throat': { conditions: ['Pharyngitis', 'Tonsillitis', 'Strep Throat'], weight: 2, category: 'respiratory' },
  'muscle weakness': { conditions: ['Stroke', 'Guillain-Barré', 'Myasthenia Gravis'], weight: 6, category: 'neurological' },
  'blood in urine': { conditions: ['Kidney Stones', 'UTI', 'Bladder Cancer'], weight: 7, category: 'urological' },
  'fainting': { conditions: ['Vasovagal Syncope', 'Cardiac Arrhythmia', 'Dehydration'], weight: 7, category: 'cardiac' },
  'swelling': { conditions: ['Allergic Reaction', 'DVT', 'Heart Failure'], weight: 5, category: 'general' },
  'tremors': { conditions: ["Parkinson's", 'Essential Tremor', 'Hyperthyroidism'], weight: 5, category: 'neurological' },
  'loss of appetite': { conditions: ['Depression', 'Cancer', 'Hepatitis'], weight: 3, category: 'general' },
  'weight loss': { conditions: ['Diabetes', 'Hyperthyroidism', 'Cancer'], weight: 4, category: 'general' },
  'insomnia': { conditions: ['Anxiety', 'Depression', 'Sleep Apnea'], weight: 2, category: 'psychological' },
};

export const analyzeSymptomsFrontend = (symptoms) => {
  if (!symptoms || symptoms.length === 0) {
    return { severity: 'Low', riskScore: 5, recommendedAction: 'Please provide symptoms.', probableConditions: [], emergencySummary: 'No symptoms provided.', confidenceScore: 0, categories: [] };
  }

  const normalizedSymptoms = symptoms.map(s => s.toLowerCase().trim());
  let totalWeight = 0, maxWeight = 0;
  const conditionScores = {};
  const categories = new Set();
  let matchedSymptoms = 0;

  normalizedSymptoms.forEach(symptom => {
    let bestMatch = null, bestMatchScore = 0;
    Object.keys(symptomConditionMap).forEach(key => {
      if (symptom.includes(key) || key.includes(symptom)) {
        const matchScore = symptom === key ? 1 : 0.7;
        if (matchScore > bestMatchScore) { bestMatch = key; bestMatchScore = matchScore; }
      }
    });
    if (bestMatch) {
      const entry = symptomConditionMap[bestMatch];
      totalWeight += entry.weight;
      maxWeight = Math.max(maxWeight, entry.weight);
      categories.add(entry.category);
      matchedSymptoms++;
      entry.conditions.forEach(c => { conditionScores[c] = (conditionScores[c] || 0) + entry.weight; });
    } else {
      totalWeight += 3;
      matchedSymptoms++;
    }
  });

  const avgWeight = matchedSymptoms > 0 ? totalWeight / matchedSymptoms : 0;
  const symptomCountFactor = Math.min(symptoms.length / 5, 1);
  let riskScore = Math.min(Math.round(avgWeight * 8 + maxWeight * 4 + symptomCountFactor * 20), 100);

  let severity, recommendedAction;
  if (riskScore >= 70) {
    severity = 'Critical';
    recommendedAction = 'Immediate emergency attention required. Call 911 or proceed to nearest emergency room immediately.';
  } else if (riskScore >= 40) {
    severity = 'Moderate';
    recommendedAction = 'Seek medical attention within the next few hours. Visit urgent care or schedule an emergency appointment.';
  } else {
    severity = 'Low';
    recommendedAction = 'Monitor symptoms closely. Schedule a regular appointment if symptoms persist.';
  }

  const probableConditions = Object.entries(conditionScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, score], index) => ({ name, probability: Math.min(Math.round((score / totalWeight) * 100 + Math.random() * 10), 98), rank: index + 1 }));

  const confidenceScore = Math.min(Math.round((matchedSymptoms / symptoms.length) * 85 + 10), 95);

  const topCondition = probableConditions.length > 0 ? probableConditions[0].name : 'Unknown';
  const symptomList = symptoms.slice(0, 3).join(', ');
  let emergencySummary;
  if (severity === 'Critical') {
    emergencySummary = `CRITICAL ALERT: Based on symptoms (${symptomList}), risk score is ${riskScore}/100. Most probable: ${topCondition}. Immediate medical intervention recommended.`;
  } else if (severity === 'Moderate') {
    emergencySummary = `MODERATE CONCERN: Symptoms (${symptomList}) indicate risk score ${riskScore}/100. Possible ${topCondition}. Professional evaluation recommended within hours.`;
  } else {
    emergencySummary = `LOW RISK: Symptoms (${symptomList}) show risk score ${riskScore}/100. Most likely ${topCondition}. Monitor and consult if persistent.`;
  }

  return { severity, riskScore, recommendedAction, probableConditions, emergencySummary, confidenceScore, categories: Array.from(categories), analyzedAt: new Date().toISOString(), symptomsAnalyzed: symptoms.length };
};
