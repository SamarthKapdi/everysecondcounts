const prisma = require('../config/prismaClient');
const AppError = require('../utils/AppError');
const fs = require('fs');

exports.orderTest = async (req, res, next) => {
  try {
    const { admissionId, testType } = req.body;
    
    if (!admissionId || !testType) {
      return next(new AppError('Admission ID and Test Type are required', 400));
    }

    const testOrder = await prisma.testOrder.create({
      data: {
        admissionId,
        orderedById: req.user.id,
        testType,
        status: 'ORDERED'
      },
      include: {
        orderedBy: { select: { name: true } }
      }
    });

    res.status(201).json({
      status: 'success',
      data: { testOrder }
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const { admissionId, status } = req.query;
    const where = {};
    
    if (admissionId) where.admissionId = admissionId;
    if (status) where.status = status;

    const orders = await prisma.testOrder.findMany({
      where,
      include: {
        orderedBy: { select: { name: true, role: true } },
        admission: { 
          select: { 
            patient: { select: { name: true } },
            hospital: { select: { name: true } }
          }
        },
        result: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      status: 'success',
      results: orders.length,
      data: { orders }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTestStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    const order = await prisma.testOrder.update({
      where: { id: req.params.id },
      data: { status }
    });

    res.json({
      status: 'success',
      data: { order }
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadResult = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return next(new AppError('Please upload a result file (PDF)', 400));
    }

    const fileType = req.file.mimetype;
    const filePath = req.file.path;
    let extractedText = null;
    let structuredData = null;

    // Use priority #1 AI extraction logic if it's a PDF
    if (fileType === 'application/pdf') {
      try {
        const pdfParse = require('pdf-parse');
        const fileBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(fileBuffer);
        extractedText = pdfData.text || '';
      } catch (err) {
        console.error('PDF extraction failed:', err);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const newResult = await tx.testResult.create({
        data: {
          testOrderId: id,
          reportFileUrl: filePath.replace(/\\/g, '/'), // normalize path
          extractedText,
          resultData: structuredData
        }
      });

      await tx.testOrder.update({
        where: { id },
        data: { status: 'COMPLETED' }
      });

      return newResult;
    });

    res.status(201).json({
      status: 'success',
      data: { result }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new AppError('A result has already been uploaded for this order', 400));
    }
    next(error);
  }
};

exports.markReviewed = async (req, res, next) => {
  try {
    const result = await prisma.testResult.update({
      where: { id: req.params.resultId },
      data: {
        reviewedById: req.user.id,
        reviewedAt: new Date()
      },
      include: {
        reviewedBy: { select: { name: true } }
      }
    });

    res.json({
      status: 'success',
      data: { result }
    });
  } catch (error) {
    next(error);
  }
};
