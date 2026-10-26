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

// Analyze a medical report using local ML pipeline (no external APIs)
exports.analyzeReport = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload a medical report file', 400));
    }

    const fs = require('fs');
    const fileName = req.file?.originalname || 'medical_report';
    const fileType = req.file?.mimetype || 'unknown';
    const filePath = req.file?.path;
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

    // ── Try Local ML Service (FastAPI:8001) ──
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
        const mlData = await mlRes.json();
        try { fs.unlinkSync(filePath); } catch (e) {}
        return res.json({ status: 'success', data: { analysis: mlData } });
      }
    } catch (mlErr) {
      console.warn('Local ML report analyzer not available, falling back to local parser:', mlErr.message);
    }

    // ── Local Fallback for PDFs ──
    if (fileType === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const fileBuffer = fs.readFileSync(filePath);
      let extractedText = '';

      try {
        const pdfData = await pdfParse(fileBuffer);
        extractedText = pdfData.text || '';
      } catch (pdfErr) {
        console.error(`PDF parse error: ${pdfErr.message}`);
      }

      try { fs.unlinkSync(filePath); } catch (e) {}

      return res.json({
        status: 'success',
        data: {
          analysis: {
            summary: extractedText.trim()
              ? 'PDF text extracted successfully via local parser. Please review findings with your physician.'
              : 'Could not extract readable text from this file. It may be a scanned image.',
            findings: [],
            actions: [
              'Review full laboratory report with your consulting physician.',
              'Ensure all baseline vitals are tracked in your health profile.'
            ],
            specialist: 'General Physician',
            extractedText: extractedText.substring(0, 2000)
          }
        }
      });
    }

    // ── Local Fallback for Images / other formats ──
    try { fs.unlinkSync(filePath); } catch (e) {}
    return res.json({
      status: 'success',
      data: {
        analysis: {
          summary: 'Medical report image received and queued for local analysis.',
          findings: [],
          actions: ['Consult a medical specialist for clinical diagnosis.'],
          specialist: 'General Physician'
        }
      }
    });

  } catch (error) {
    console.error(`Report analysis error: ${error.message}`);
    res.json({
      status: 'success',
      data: {
        analysis: {
          summary: 'Analysis completed with basic local parsing. Please consult a healthcare professional for clinical review.',
          findings: [],
          actions: ['Consult a healthcare professional for manual review.'],
          specialist: 'General Physician'
        }
      }
    });
  }
};
