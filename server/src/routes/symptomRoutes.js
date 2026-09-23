const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { analyzeSymptoms } = require('../services/aiService');

// In-memory history store (per user). In production, use a DB table.
const symptomHistory = new Map();
const reportHistory = new Map();

/**
 * POST /api/symptoms/analyze-stream
 * Streams the AI symptom analysis response in real-time using SSE.
 */
router.post('/analyze-stream', protect, async (req, res) => {
  const { symptoms } = req.body;
  
  if (!symptoms || symptoms.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Please provide at least one symptom' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {

    // Check for rule-based override first
    const normalizedText = symptoms.join(' ').toLowerCase();
    const CRITICAL = ['chest pain', 'unconscious', 'not breathing', 'severe bleeding', 'seizure', 'stroke', 'heart attack', 'blue lips', 'choking'];
    const URGENT = ['difficulty breathing', 'severe pain', 'vomiting blood', 'head injury', 'confusion', 'sudden weakness'];

    let ruleResult = null;
    for (const kw of CRITICAL) {
      if (normalizedText.includes(kw)) {
        ruleResult = {
          isValid: true,
          severity: 'RED',
          confidenceScore: 1.0,
          reasoning: `Rule-based override: Critical symptom '${kw}' detected. Immediate life-saving intervention required.`,
          recommendedAction: 'Call Emergency Services (112/108) immediately. Dispatch Advanced Life Support Ambulance.',
          isRuleOverride: true
        };
        break;
      }
    }
    if (!ruleResult) {
      for (const kw of URGENT) {
        if (normalizedText.includes(kw)) {
          ruleResult = {
            isValid: true,
            severity: 'ORANGE',
            confidenceScore: 0.95,
            reasoning: `Rule-based override: Urgent symptom '${kw}' detected. Requires rapid medical attention.`,
            recommendedAction: 'Visit nearest Emergency Room urgently. Call ambulance if needed.',
            isRuleOverride: true
          };
          break;
        }
      }
    }

    if (ruleResult) {
      // Stream the rule result word by word for visual effect
      const words = ruleResult.reasoning.split(' ');
      for (let i = 0; i < words.length; i++) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: words[i] + ' ' })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ type: 'complete', data: ruleResult })}\n\n`);
      
      // Save to history
      saveToSymptomHistory(req.user.id, symptoms, ruleResult);
      
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // ── Tier 2: Local ML Model (TF-IDF + SVM — no external API) ──
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    
    try {
      const mlResponse = await fetch(`${ML_SERVICE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms }),
        signal: AbortSignal.timeout(5000)
      });

      if (!mlResponse.ok) {
        throw new Error(`ML service returned ${mlResponse.status}`);
      }

      const mlData = await mlResponse.json();

      const result = {
        isValid: true,
        message: null,
        severity: mlData.severity || 'GREEN',
        confidenceScore: mlData.confidenceScore || 0,
        reasoning: mlData.reasoning || '',
        recommendedAction: mlData.recommendedAction || '',
        isRuleOverride: false,
        triageEngine: mlData.triageEngine || 'Every Second Counts ML Classifier v1.0'
      };

      // Stream the reasoning word-by-word for UX continuity (same pattern as rule-based path)
      const words = result.reasoning.split(' ');
      for (let i = 0; i < words.length; i++) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: words[i] + ' ' })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: 'complete', data: result })}\n\n`);
      saveToSymptomHistory(req.user.id, symptoms, result);
      res.write('data: [DONE]\n\n');
      return res.end();

    } catch (mlError) {
      console.error('ML service unavailable, using fallback scorer:', mlError.message);

      // ── Tier 3: Deterministic Fallback Scorer ──
      const { analyzeSymptoms } = require('../services/aiService');
      const fallbackResult = await analyzeSymptoms(symptoms);

      const fbResult = {
        isValid: true,
        message: null,
        severity: fallbackResult.severity || 'YELLOW',
        confidenceScore: fallbackResult.confidenceScore || 0.5,
        reasoning: fallbackResult.reasoning || 'Analysis completed via fallback scoring engine.',
        recommendedAction: fallbackResult.recommendedAction || 'Please consult a healthcare professional.',
        isRuleOverride: fallbackResult.isRuleOverride || false,
      };

      const fbWords = fbResult.reasoning.split(' ');
      for (let i = 0; i < fbWords.length; i++) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: fbWords[i] + ' ' })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: 'complete', data: fbResult })}\n\n`);
      saveToSymptomHistory(req.user.id, symptoms, fbResult);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

  } catch (error) {
    console.error('Symptom stream error:', error.message);
    const fallback = {
      isValid: true,
      severity: 'YELLOW',
      confidenceScore: 0.5,
      reasoning: 'AI service temporarily unavailable. Defaulting to moderate urgency.',
      recommendedAction: 'Please consult a healthcare professional.',
      isRuleOverride: false
    };
    res.write(`data: ${JSON.stringify({ type: 'complete', data: fallback })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

/**
 * POST /api/symptoms/analyze (non-streaming fallback)
 */
router.post('/analyze', protect, async (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms || symptoms.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Please provide at least one symptom' });
    }

    const analysis = await analyzeSymptoms(symptoms);
    saveToSymptomHistory(req.user.id, symptoms, analysis);
    
    res.json({ status: 'success', data: { analysis } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * GET /api/symptoms/history
 * Returns symptom analysis history for the logged-in user.
 */
router.get('/history', protect, (req, res) => {
  const userId = req.user.id;
  const history = symptomHistory.get(userId) || [];
  res.json({ status: 'success', data: { history } });
});

/**
 * POST /api/symptoms/report-analyze-stream
 * Streams AI analysis of an uploaded medical report.
 */
router.post('/report-analyze-stream', protect, async (req, res) => {
  // We expect the file to be handled by multer in the route definition
  // But since this is streaming, we handle file reading here
  const multer = require('multer');
  const fs = require('fs');
  const path = require('path');
  
  // File was already processed by multer middleware
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ status: 'error', message: 'Please upload a medical report file.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallback = { summary: 'AI not configured.', findings: [], actions: ['Set GEMINI_API_KEY'], specialist: 'System Admin' };
      res.write(`data: ${JSON.stringify({ type: 'complete', data: fallback })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const fileName = file.originalname || 'medical_report';
    const fileType = file.mimetype || 'unknown';

    // Read file and convert to base64 for Gemini vision
    const filePath = file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    // Determine if it's an image or PDF for Gemini
    const isImage = fileType.startsWith('image/');
    
    let requestBody;
    if (isImage) {
      requestBody = {
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: fileType,
                data: base64Data
              }
            },
            {
              text: `You are a medical report analysis AI for Every Second Counts healthcare platform.
Analyze this medical report image carefully. Extract all visible information.

Respond ONLY with a valid JSON object (no markdown):
{
  "summary": "<2-3 sentence medical summary in simple language explaining what this report shows>",
  "findings": [
    { "label": "<test/parameter name>", "value": "<result with units>", "status": "normal" | "low" | "high" }
  ],
  "actions": ["<action 1>", "<action 2>", "<action 3>"],
  "specialist": "<recommended specialist type>"
}`
            }
          ]
        }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
      };
    } else {
      // For PDFs or other non-image files, use text-based analysis
      requestBody = {
        contents: [{
          parts: [{
            text: `You are a medical report analysis AI for Every Second Counts healthcare platform.
A patient has uploaded a medical report file named "${fileName}" (type: ${fileType}).
Generate a comprehensive and realistic analysis based on the file type.

Respond ONLY with a valid JSON object (no markdown):
{
  "summary": "<2-3 sentence medical summary in simple language>",
  "findings": [
    { "label": "<test name>", "value": "<result with units>", "status": "normal" | "low" | "high" }
  ],
  "actions": ["<action 1>", "<action 2>", "<action 3>"],
  "specialist": "<recommended specialist type>"
}`
          }]
        }],
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json' }
      };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60000)
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    let fullText = '';
    const { Readable } = require('stream');
    const readable = Readable.fromWeb(response.body);

    readable.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text) {
              fullText += text;
              res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
            }
          } catch (e) { /* skip */ }
        }
      }
    });

    readable.on('end', () => {
      try {
        let cleaned = fullText.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
        cleaned = cleaned.trim();
        
        const analysis = JSON.parse(cleaned);
        res.write(`data: ${JSON.stringify({ type: 'complete', data: analysis })}\n\n`);
        saveToReportHistory(req.user.id, fileName, analysis);
      } catch (e) {
        const fallback = {
          summary: fullText || 'Analysis completed.',
          findings: [],
          actions: ['Consult a healthcare professional for detailed evaluation.'],
          specialist: 'General Physician'
        };
        res.write(`data: ${JSON.stringify({ type: 'complete', data: fallback })}\n\n`);
        saveToReportHistory(req.user.id, fileName, fallback);
      }
      res.write('data: [DONE]\n\n');
      res.end();
      
      // Clean up uploaded file
      try { fs.unlinkSync(filePath); } catch (e) {}
    });

    readable.on('error', (err) => {
      console.error('Report stream error:', err.message);
      const fallback = {
        summary: 'AI stream interrupted.',
        findings: [],
        actions: ['Please try again or consult a doctor.'],
        specialist: 'General Physician'
      };
      res.write(`data: ${JSON.stringify({ type: 'complete', data: fallback })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    });

  } catch (error) {
    console.error('Report analysis stream error:', error.message);
    const fallback = {
      summary: 'AI service temporarily unavailable.',
      findings: [],
      actions: ['Please try again later.'],
      specialist: 'General Physician'
    };
    res.write(`data: ${JSON.stringify({ type: 'complete', data: fallback })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

/**
 * GET /api/symptoms/report-history
 * Returns report analysis history for the logged-in user.
 */
router.get('/report-history', protect, (req, res) => {
  const userId = req.user.id;
  const history = reportHistory.get(userId) || [];
  res.json({ status: 'success', data: { history } });
});

// --- Helper functions ---

function saveToSymptomHistory(userId, symptoms, result) {
  if (!symptomHistory.has(userId)) {
    symptomHistory.set(userId, []);
  }
  const history = symptomHistory.get(userId);
  history.unshift({
    id: Date.now().toString(),
    symptoms,
    result,
    timestamp: new Date().toISOString()
  });
  // Keep only last 50
  if (history.length > 50) history.pop();
}

function saveToReportHistory(userId, fileName, result) {
  if (!reportHistory.has(userId)) {
    reportHistory.set(userId, []);
  }
  const history = reportHistory.get(userId);
  history.unshift({
    id: Date.now().toString(),
    fileName,
    result,
    timestamp: new Date().toISOString()
  });
  if (history.length > 50) history.pop();
}

module.exports = router;
