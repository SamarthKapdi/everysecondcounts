const prisma = require('../config/prismaClient');
const AppError = require('../utils/AppError');

// Get patient medical history (combines cases, doctor notes, and triage logs)
exports.getMedicalHistory = async (req, res, next) => {
  try {
    const patientId = req.params.patientId || req.user.id;

    const cases = await prisma.emergencyCase.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        hospital: { select: { name: true } },
        doctorNotes: {
          include: { doctor: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        },
        triageLogs: {
          include: { loggedBy: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    res.json({
      status: 'success',
      data: {
        emergencyHistory: cases,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all recent doctor notes for a patient
exports.getReports = async (req, res, next) => {
  try {
    let whereClause = {};

    if (req.user.role === 'PATIENT') {
      // Patient sees only their own reports
      whereClause = { emergency: { patientId: req.user.id } };
    } else if (req.user.role === 'DOCTOR') {
      // Doctor sees notes they wrote OR all recent notes if no specific patient
      const patientId = req.query.patient_id;
      if (patientId) {
        whereClause = { emergency: { patientId } };
      } else {
        whereClause = { doctorId: req.user.id };
      }
    } else {
      // Admin/Staff can see all
      const patientId = req.query.patient_id;
      if (patientId) {
        whereClause = { emergency: { patientId } };
      }
    }

    const notes = await prisma.doctorNote.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        emergency: { select: { severity: true, symptoms: true, patient: { select: { name: true } } } },
        doctor: { select: { name: true } }
      }
    });

    res.json({
      status: 'success',
      results: notes.length,
      data: { reports: notes },
    });
  } catch (error) {
    next(error);
  }
};

// Create a new doctor note (report equivalent)
exports.createReport = async (req, res, next) => {
  try {
    const { case_id, content } = req.body;

    if (!case_id || !content) {
      return next(new AppError('Case ID and content are required', 400));
    }

    const note = await prisma.doctorNote.create({
      data: {
        emergencyId: case_id,
        doctorId: req.user.id,
        note: content
      }
    });

    res.status(201).json({
      status: 'success',
      data: { report: note },
    });
  } catch (error) {
    next(error);
  }
};

// Analyze a medical report using real PDF text extraction + Gemini AI
exports.analyzeReport = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload a medical report file', 400));
    }

    const fs = require('fs');
    const fileName = req.file?.originalname || 'medical_report';
    const fileType = req.file?.mimetype || 'unknown';
    const filePath = req.file?.path;

    const apiKey = process.env.GEMINI_API_KEY;

    // ── PDF files: extract text with pdf-parse, then analyze ──
    if (fileType === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const fileBuffer = fs.readFileSync(filePath);
      let extractedText = '';

      try {
        const pdfData = await pdfParse(fileBuffer);
        extractedText = pdfData.text || '';
      } catch (pdfErr) {
        console.error(`PDF parse error: ${pdfErr.message}`);
        return next(new AppError('Failed to parse PDF file. The file may be corrupted or image-only.', 400));
      }

      // Clean up uploaded file
      try { fs.unlinkSync(filePath); } catch (e) {}

      if (!extractedText.trim()) {
        return next(new AppError('No text could be extracted from this PDF. It may be a scanned/image-only PDF — please upload as an image instead.', 400));
      }

      if (!apiKey) {
        // Without Gemini, return the raw extracted text
        return res.json({
          status: 'success',
          data: {
            analysis: {
              summary: 'PDF text extracted successfully but AI analysis is unavailable (GEMINI_API_KEY not set).',
              findings: [],
              actions: ['Configure GEMINI_API_KEY for AI-powered analysis'],
              specialist: 'System Administrator',
              extractedText: extractedText.substring(0, 2000) // Cap for response size
            }
          }
        });
      }

      // Send extracted text to Gemini for structured analysis
      const prompt = `You are a medical report analysis AI for Every Second Counts healthcare platform.
Analyze the following extracted text from a medical report PDF named "${fileName}":

--- START OF REPORT TEXT ---
${extractedText.substring(0, 4000)}
--- END OF REPORT TEXT ---

Respond ONLY with a valid JSON object (no markdown, no extra text):
{
  "summary": "<2-3 sentence medical summary in simple language>",
  "findings": [
    { "label": "<test/parameter name>", "value": "<result with units>", "status": "normal" | "low" | "high" }
  ],
  "actions": ["<action 1>", "<action 2>"],
  "specialist": "<recommended specialist type>"
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
          }),
          signal: AbortSignal.timeout(15000)
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const analysis = JSON.parse(aiText);

      return res.json({ status: 'success', data: { analysis } });
    }

    // ── Image files: use Gemini Vision (already real, not mocked) ──
    if (fileType.startsWith('image/')) {
      if (!apiKey) {
        try { fs.unlinkSync(filePath); } catch (e) {}
        return res.json({
          status: 'success',
          data: {
            analysis: {
              summary: 'AI analysis service is not configured (GEMINI_API_KEY missing).',
              findings: [],
              actions: ['Configure GEMINI_API_KEY in server environment'],
              specialist: 'System Administrator'
            }
          }
        });
      }

      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');

      // Clean up uploaded file
      try { fs.unlinkSync(filePath); } catch (e) {}

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { mimeType: fileType, data: base64Data } },
                { text: `You are a medical report analysis AI for Every Second Counts healthcare platform.
Analyze this medical report image carefully. Extract all visible information.

Respond ONLY with a valid JSON object (no markdown):
{
  "summary": "<2-3 sentence medical summary in simple language>",
  "findings": [
    { "label": "<test/parameter name>", "value": "<result with units>", "status": "normal" | "low" | "high" }
  ],
  "actions": ["<action 1>", "<action 2>", "<action 3>"],
  "specialist": "<recommended specialist type>"
}` }
              ]
            }],
            generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
          }),
          signal: AbortSignal.timeout(30000)
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const analysis = JSON.parse(aiText);

      return res.json({ status: 'success', data: { analysis } });
    }

    // ── Unsupported format ──
    try { fs.unlinkSync(filePath); } catch (e) {}
    return next(new AppError(`Unsupported file type: ${fileType}. Please upload a PDF or image file.`, 400));

  } catch (error) {
    console.error(`Report analysis error: ${error.message}`);
    // Graceful degradation fallback
    res.json({
      status: 'success',
      data: {
        analysis: {
          summary: 'Analysis could not be completed due to a processing error. Please try again or consult a healthcare professional.',
          findings: [],
          actions: [
            'Try re-uploading the report.',
            'Ensure the file is a valid PDF or image.',
            'Consult a healthcare professional for manual review.'
          ],
          specialist: 'General Physician'
        }
      }
    });
  }
};
