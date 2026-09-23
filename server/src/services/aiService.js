/**
 * Every Second Counts Service - Hybrid AI Symptom Analysis Engine
 * Combines deterministic rule-based medical logic with a locally trained ML model for explainability.
 */

// Critical keywords that immediately trigger RED severity (Rule-based Layer)
const CRITICAL_KEYWORDS = [
  'chest pain', 'unconscious', 'not breathing', 'severe bleeding', 
  'seizure', 'stroke', 'heart attack', 'blue lips', 'choking'
];

// Urgent keywords that trigger ORANGE severity
const URGENT_KEYWORDS = [
  'difficulty breathing', 'severe pain', 'vomiting blood', 
  'head injury', 'confusion', 'sudden weakness'
];

/**
 * Rule-Based Pre-Triage Engine
 * Prevents AI hallucinations from downplaying obvious life-threatening emergencies.
 */
const performRuleBasedTriage = (symptoms) => {
  const normalizedText = symptoms.join(' ').toLowerCase();

  for (const keyword of CRITICAL_KEYWORDS) {
    if (normalizedText.includes(keyword)) {
      return {
        severity: 'RED',
        confidenceScore: 1.0,
        reasoning: `Rule-based override: Patient reported critical symptom matching '${keyword}'. Immediate life-saving intervention required.`,
        recommendedAction: 'Dispatch Advanced Life Support (ALS) Ambulance immediately. Route to nearest Trauma Center.',
        isRuleOverride: true
      };
    }
  }

  for (const keyword of URGENT_KEYWORDS) {
    if (normalizedText.includes(keyword)) {
      return {
        severity: 'ORANGE',
        confidenceScore: 0.95,
        reasoning: `Rule-based override: Patient reported urgent symptom matching '${keyword}'. Requires rapid medical attention.`,
        recommendedAction: 'Dispatch Standard Ambulance. Route to nearest equipped Emergency Room.',
        isRuleOverride: true
      };
    }
  }

  return null; // Passes to AI layer
};

/**
 * Local ML Model Integration (Tier 2 — Trained TF-IDF + SVM Classifier)
 *
 * Calls the locally hosted FastAPI prediction service instead of an external API.
 * The model was trained on a symptom-severity dataset using scikit-learn.
 * See docs/model-metrics.md for accuracy, precision, recall, and F1 scores.
 *
 * Architecture: TF-IDF Vectorizer (unigram+bigram) → CalibratedClassifierCV(LinearSVC)
 * Test Accuracy: ~97.7% | 5-fold CV: ~97.7% ± 0.4%
 */
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

const callLocalMLModel = async (symptoms) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptoms }),
      signal: AbortSignal.timeout(5000) // 5-second timeout (local service is fast)
    });

    if (!response.ok) {
      throw new Error(`ML service returned status ${response.status}`);
    }

    const data = await response.json();

    return {
      isValid: true,
      message: null,
      severity: data.severity || 'GREEN',
      confidenceScore: data.confidenceScore || 0,
      reasoning: data.reasoning || '',
      recommendedAction: data.recommendedAction || '',
      isRuleOverride: false,
      triageEngine: data.triageEngine || 'Every Second Counts ML Classifier v1.0'
    };

  } catch (error) {
    console.error(`Local ML Triage Error: ${error.message}`);
    return null; // Falls through to Tier 3 (deterministic fallback scorer)
  }
};

/**
 * Intelligent Fallback Triage — symptom-weighted scoring engine
 * Provides realistic triage even if the ML service is unavailable
 */
const SYMPTOM_SCORES = {
  // High risk (score 8-10)
  'chest pain': 10, 'heart attack': 10, 'unconscious': 10, 'not breathing': 10,
  'severe bleeding': 10, 'seizure': 9, 'stroke': 10, 'choking': 10,
  'blue lips': 10, 'cardiac arrest': 10, 'anaphylaxis': 9,
  // Medium-high risk (score 6-8)
  'difficulty breathing': 8, 'shortness of breath': 8, 'severe pain': 7,
  'vomiting blood': 8, 'head injury': 8, 'confusion': 7, 'sudden weakness': 7,
  'high fever': 6, 'severe headache': 6, 'numbness': 7, 'loss of consciousness': 9,
  'abdominal pain': 5, 'blurred vision': 6, 'difficulty speaking': 8,
  'severe burn': 8, 'poisoning': 8, 'overdose': 9,
  // Medium risk (score 3-5)
  'dizziness': 4, 'nausea': 3, 'vomiting': 4, 'bleeding': 5,
  'fracture': 5, 'sprain': 3, 'back pain': 4, 'fever': 4,
  'cough': 3, 'sore throat': 2, 'rash': 2, 'fatigue': 3,
  'headache': 3, 'ear pain': 2, 'eye pain': 3, 'joint pain': 3,
  // Low risk (score 1-2)
  'mild pain': 2, 'cold': 1, 'runny nose': 1, 'sneezing': 1,
  'mild headache': 2, 'stomach ache': 2, 'insomnia': 1,
};

const performFallbackTriage = (symptoms) => {
  const combined = symptoms.join(' ').toLowerCase();
  let totalScore = 0;
  let matchedSymptoms = [];

  // Score each known symptom
  for (const [symptom, score] of Object.entries(SYMPTOM_SCORES)) {
    if (combined.includes(symptom)) {
      totalScore += score;
      matchedSymptoms.push({ symptom, score });
    }
  }

  // Boost for multiple symptoms (compound risk)
  if (matchedSymptoms.length >= 4) totalScore += 2;
  if (matchedSymptoms.length >= 6) totalScore += 3;

  // Determine severity based on cumulative score
  let severity, reasoning, action, confidence;

  if (totalScore >= 15) {
    severity = 'RED';
    confidence = Math.min(0.95, 0.7 + totalScore * 0.01);
    reasoning = `Critical risk assessment: Patient reports ${matchedSymptoms.map(m => m.symptom).join(', ')}. Combined symptom severity score is ${totalScore}/30. Multiple high-risk indicators suggest immediate life-threatening condition requiring emergency intervention.`;
    action = 'Dispatch Advanced Life Support (ALS) Ambulance immediately. Route to nearest Trauma Center with ICU availability.';
  } else if (totalScore >= 8) {
    severity = 'ORANGE';
    confidence = Math.min(0.90, 0.65 + totalScore * 0.02);
    reasoning = `Urgent risk assessment: Patient reports ${matchedSymptoms.map(m => m.symptom).join(', ')}. Combined symptom severity score is ${totalScore}/30. Symptoms indicate potentially serious condition requiring rapid medical evaluation.`;
    action = 'Dispatch Standard Ambulance. Route to nearest equipped Emergency Room. Prioritize within 30 minutes.';
  } else if (totalScore >= 4) {
    severity = 'YELLOW';
    confidence = Math.min(0.85, 0.6 + totalScore * 0.04);
    reasoning = `Moderate risk assessment: Patient reports ${matchedSymptoms.map(m => m.symptom).join(', ')}. Combined symptom severity score is ${totalScore}/30. Symptoms suggest non-urgent but medically significant condition. Professional evaluation recommended.`;
    action = 'Schedule urgent care visit within 2-4 hours. Self-transport recommended unless condition worsens. Monitor for danger signs.';
  } else {
    severity = 'GREEN';
    confidence = Math.min(0.80, 0.5 + totalScore * 0.05);
    const symptomText = matchedSymptoms.length > 0 ? matchedSymptoms.map(m => m.symptom).join(', ') : symptoms.join(', ');
    reasoning = `Low risk assessment: Patient reports ${symptomText}. Combined symptom severity score is ${totalScore}/30. Symptoms are consistent with minor or self-limiting condition. Home management with monitoring is appropriate.`;
    action = 'Home care recommended. Over-the-counter medications as appropriate. Seek medical attention if symptoms worsen or persist beyond 48 hours.';
  }

  return {
    severity,
    confidenceScore: parseFloat(confidence.toFixed(2)),
    reasoning,
    recommendedAction: action,
    isRuleOverride: false,
    triageEngine: 'Every Second Counts Symptom Scoring Engine v2.0',
  };
};

/**
 * Analyze symptoms using Hybrid Triage Engine
 * @param {string[]} symptoms - Array of symptom strings
 * @returns {object} Hybrid AI analysis result
 */
const analyzeSymptoms = async (symptoms) => {
  if (!symptoms || symptoms.length === 0) {
    return {
      severity: 'GREEN',
      confidenceScore: 1.0,
      reasoning: 'No symptoms provided.',
      recommendedAction: 'Please provide symptoms for accurate triage.',
    };
  }

  // 1. Rule-Based Triage (Safety First)
  const ruleResult = performRuleBasedTriage(symptoms);
  if (ruleResult) {
    return ruleResult;
  }

  // 2. ML Model Triage (Trained TF-IDF + SVM Classifier — local, no external API)
  const mlResult = await callLocalMLModel(symptoms);
  if (mlResult) {
    return mlResult;
  }

  // 3. Fallback Triage (System Resilience)
  return performFallbackTriage(symptoms);
};

module.exports = { analyzeSymptoms };
