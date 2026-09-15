/**
 * PulsePath AI Service — Hybrid AI Symptom Analysis Engine
 * Combines deterministic rule-based medical logic with Gemini AI for explainability.
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
 * Gemini AI Integration Service (Explanation Layer)
 */
const callGeminiAI = async (symptoms) => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }

  const prompt = `
  You are an expert AI emergency medical triage assistant for PulsePath AI.
  Analyze the following patient input: [${symptoms.join(', ')}]
  
  CRITICAL LANGUAGE RULE: Detect the language of the user's input and respond in the SAME language.
  - Hindi (Devanagari) → respond in Hindi
  - Hinglish (Roman script Hindi like "bukhar", "sar dard") → respond in Hinglish
  - English → respond in English
  
  First, determine if the input contains ANY valid medical symptoms, health concerns, or emergency descriptions.
  If the input is just a greeting (like "hi", "hello"), random text, or unrelated to health, set "isValid" to false.

  Respond ONLY with a valid JSON object using the following exact structure, with no markdown formatting or extra text.
  {
    "isValid": <boolean>,
    "message": "<If isValid is false, provide a friendly message in the user's language asking them to describe their medical symptoms. If true, leave empty>",
    "severity": "GREEN" | "YELLOW" | "ORANGE" | "RED",
    "confidenceScore": <float between 0.0 and 1.0>,
    "reasoning": "<Detailed but concise medical reasoning. MUST be in the user's language.>",
    "recommendedAction": "<Specific action to take. MUST be in the user's language.>"
  }
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2, // Low temperature for deterministic medical output
          responseMimeType: 'application/json',
        }
      }),
      signal: AbortSignal.timeout(15000) // 15-second timeout
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const aiText = data.candidates[0].content.parts[0].text;
    const parsedData = JSON.parse(aiText);
    
    return {
      isValid: parsedData.isValid !== undefined ? parsedData.isValid : true,
      message: parsedData.message || null,
      severity: parsedData.severity || 'GREEN',
      confidenceScore: parsedData.confidenceScore || 0,
      reasoning: parsedData.reasoning || '',
      recommendedAction: parsedData.recommendedAction || '',
      isRuleOverride: false
    };

  } catch (error) {
    console.error(`Gemini AI Triage Error: ${error.message}`);
    return null; // Fallback to basic logic
  }
};

/**
 * Intelligent Fallback Triage — symptom-weighted scoring engine
 * Provides realistic triage even if Gemini is unavailable
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
    triageEngine: 'PulsePath Symptom Scoring Engine v2.0',
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

  // 2. AI Triage (Explanation & Nuance)
  const aiResult = await callGeminiAI(symptoms);
  if (aiResult) {
    return aiResult;
  }

  // 3. Fallback Triage (System Resilience)
  return performFallbackTriage(symptoms);
};

module.exports = { analyzeSymptoms };
