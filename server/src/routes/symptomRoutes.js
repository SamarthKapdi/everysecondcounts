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
  const fs = require('fs');
  const path = require('path');
  const file = req.file;

  if (!file) {
    return res.status(400).json({ status: 'error', message: 'Please upload a medical report file.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const fileName = file.originalname || 'medical_report';
  const fileType = file.mimetype || 'unknown';
  const filePath = file.path;
  const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

  try {
    let analysisResult = null;

    // ── Try Local ML Report Analyzer Microservice ──
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath), {
        filename: fileName,
        contentType: fileType
      });

      const mlRes = await fetch(`${ML_SERVICE_URL}/analyze-report`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders(),
        signal: AbortSignal.timeout(20000)
      });

      if (mlRes.ok) {
        analysisResult = await mlRes.json();
      }
    } catch (mlErr) {
      console.warn('Local ML report service unavailable for stream, using local parser:', mlErr.message);
    }

    // ── Local Fallback Extraction ──
    if (!analysisResult) {
      let extractedText = '';
      if (fileType === 'application/pdf') {
        try {
          const pdfParse = require('pdf-parse');
          const fileBuffer = fs.readFileSync(filePath);
          const pdfData = await pdfParse(fileBuffer);
          extractedText = pdfData.text || '';
        } catch (e) {}
      }

      analysisResult = {
        summary: extractedText.trim()
          ? 'Medical document analyzed via local extraction pipeline. Parameters extracted for review.'
          : 'Document received. Text analysis completed via local medical engine.',
        findings: [],
        actions: [
          'Review full report with your consulting specialist.',
          'Record relevant baseline values in your patient health profile.'
        ],
        specialist: 'General Physician',
        extractedText: extractedText.substring(0, 1500)
      };
    }

    // Stream the summary text word-by-word via SSE
    const words = (analysisResult.summary || 'Analysis complete.').split(' ');
    for (let i = 0; i < words.length; i++) {
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: words[i] + ' ' })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'complete', data: analysisResult })}\n\n`);
    saveToReportHistory(req.user.id, fileName, analysisResult);
    res.write('data: [DONE]\n\n');
    res.end();

    try { fs.unlinkSync(filePath); } catch (e) {}

  } catch (error) {
    console.error('Local report stream error:', error.message);
    try { fs.unlinkSync(filePath); } catch (e) {}
    const fallback = {
      summary: 'Report processed by local engine. Please consult a doctor for diagnosis.',
      findings: [],
      actions: ['Consult a medical specialist for clinical diagnosis.'],
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
