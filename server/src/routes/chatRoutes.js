const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

// Deterministic fallback intents if ML service is unreachable
const FALLBACK_INTENTS = [
  {
    keywords: ['chest pain', 'heart attack', 'angina', 'crushing chest', 'heart hurts'],
    reply: '🚨 CRITICAL EMERGENCY (CARDIAC): 1. Call Emergency Services (112/108) or tap SOS immediately. 2. Rest in a semi-upright position. 3. Chew an uncoated aspirin (325mg) if available and not allergic. 4. If unresponsive and not breathing, begin CPR.'
  },
  {
    keywords: ['bleeding', 'cut', 'wound', 'hemorrhage', 'blood spurting'],
    reply: '🩸 FIRST AID FOR BLEEDING: 1. Apply firm, continuous direct pressure with a clean cloth. 2. Elevate the injured area above heart level. 3. Do not remove soaked cloths—layer on top. 4. If bleeding won\'t stop after 5-10 minutes, seek emergency medical care.'
  },
  {
    keywords: ['burn', 'scald', 'hot water', 'blister', 'fire'],
    reply: '🔥 FIRST AID FOR BURNS: 1. Cool under gentle running tap water for 10-20 minutes. 2. Never use ice, butter, or oil. 3. Cover loosely with sterile, non-stick dressing. 4. Seek hospital emergency care if larger than 3 inches, blistered, or charred.'
  },
  {
    keywords: ['choking', 'heimlich', 'throat blocked', 'cannot breathe food'],
    reply: '🗣️ FIRST AID FOR CHOKING: 1. Give 5 sharp back blows between shoulder blades. 2. Perform Heimlich maneuver (5 inward-and-upward abdominal thrusts above navel). 3. If person collapses unconscious, call 112/108 and begin chest compressions.'
  },
  {
    keywords: ['stroke', 'droop', 'slurred', 'arm weakness', 'face drooping'],
    reply: '🧠 STROKE ALERT (F.A.S.T.): 1. Face drooping, 2. Arm weakness, 3. Speech difficulty. 4. Time to call 112/108 immediately! Note symptom onset time. Do not administer aspirin or food.'
  },
  {
    keywords: ['fracture', 'broken bone', 'snap', 'bone sticking out'],
    reply: '🦴 FIRST AID FOR FRACTURES: 1. Keep the limb still. Do not try to realign or push bones back. 2. Apply a cold pack wrapped in a cloth. 3. Support or splint without forcing movement. 4. Transport to trauma hospital immediately.'
  },
  {
    keywords: ['fever', 'high temperature', 'chills', 'shivering'],
    reply: '🌡️ FIRST AID FOR HIGH FEVER: 1. Rest in a cool, ventilated room and hydrate with water/ORS. 2. Sponge forehead/armpits with lukewarm water. 3. Seek emergency care if temperature exceeds 40°C (104°F) or if accompanied by stiff neck or seizures.'
  },
  {
    keywords: ['allergic', 'allergy', 'anaphylaxis', 'hives', 'epipen', 'peanut'],
    reply: '⚠️ FIRST AID FOR SEVERE ALLERGY: 1. Administer epinephrine auto-injector (EpiPen) into outer mid-thigh if available. 2. Call 112/108 or tap SOS immediately. 3. Keep person lying flat with feet elevated. 4. Prepare for second dose if no relief in 5-10 minutes.'
  },
  {
    keywords: ['seizure', 'convulsing', 'fit', 'epileptic'],
    reply: '⚡ FIRST AID FOR SEIZURES: 1. Ease person to floor and clear sharp objects away. 2. Turn gently onto side (recovery position). 3. Place something soft under head. Never insert anything into mouth. 4. Call 112/108 if seizure lasts >5 minutes.'
  },
  {
    keywords: ['poison', 'swallowed bleach', 'overdose', 'toxic', 'ingested'],
    reply: '🧪 FIRST AID FOR POISONING / OVERDOSE: 1. Call Emergency Services (112/108) or Poison Control immediately. 2. Do NOT induce vomiting unless directed by medical professionals. 3. Keep substance container ready to describe contents.'
  }
];

const DEFAULT_FALLBACK = "I'm not sure about that specific condition. For your safety, please contact a healthcare professional, use our AI Symptom Checker for structured triage, or tap the Emergency SOS button if you are experiencing an acute medical crisis.";

router.post('/', protect, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ status: 'error', message: 'Message is required' });
    }

    const trimmed = message.trim();

    // ── Tier 1: Try Local ML Intent Classifier (FastAPI:8001) ──
    try {
      const mlResponse = await fetch(`${ML_SERVICE_URL}/chat/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
        signal: AbortSignal.timeout(3000)
      });

      if (mlResponse.ok) {
        const data = await mlResponse.json();
        return res.json({
          status: 'success',
          data: {
            reply: data.reply,
            intent: data.intent,
            confidence: data.confidence,
            isFallback: data.isFallback,
            source: 'local-ml-model'
          }
        });
      }
    } catch (mlErr) {
      console.warn('Local ML chat service unreachable, using local deterministic fallback:', mlErr.message);
    }

    // ── Tier 2: Deterministic Local Fallback (no network dependency) ──
    const lower = trimmed.toLowerCase();
    for (const item of FALLBACK_INTENTS) {
      if (item.keywords.some(kw => lower.includes(kw))) {
        return res.json({
          status: 'success',
          data: {
            reply: item.reply,
            intent: item.keywords[0],
            confidence: 0.9,
            isFallback: false,
            source: 'local-rule-engine'
          }
        });
      }
    }

    return res.json({
      status: 'success',
      data: {
        reply: DEFAULT_FALLBACK,
        intent: 'unknown',
        confidence: 0.1,
        isFallback: true,
        source: 'local-rule-engine'
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
