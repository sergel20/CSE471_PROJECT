const PDFDocument = require('pdfkit');
const Report = require('../models/report');

const createReport = async (req, res) => {
  try {
    const report = await Report.create(req.body);

    res.status(201).json({
      message: 'Report created successfully',
      report,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create report',
      error: error.message,
    });
  }
};

const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });

    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch reports',
      error: error.message,
    });
  }
};

const getReportHistory = async (req, res) => {
  try {
    const reports = await Report.find({ phone: req.params.phone }).sort({
      createdAt: -1,
    });

    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch report history',
      error: error.message,
    });
  }
};

const downloadReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        message: 'Report not found',
      });
    }

    if (report.approvalStatus !== 'Approved') {
      return res.status(403).json({
        message: 'Only approved reports can be downloaded',
      });
    }

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=report-${report.sampleId}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(22).text('MediLab Connect', { align: 'center' });
    doc.fontSize(16).text('Diagnostic Report', { align: 'center' });

    doc.moveDown();

    doc.fontSize(12).text(`Patient Name: ${report.patientName}`);
    doc.text(`Phone: ${report.phone}`);
    doc.text(`Sample ID: ${report.sampleId}`);
    doc.text(`Test Name: ${report.testName}`);
    doc.text(`Result: ${report.resultValue}`);
    doc.text(`Unit: ${report.unit}`);
    doc.text(`Reference Range: ${report.referenceRange}`);
    doc.text(`Result Flag: ${report.resultFlag}`);
    doc.text(`Approval Status: ${report.approvalStatus}`);
    doc.text(`Report Date: ${new Date(report.reportDate).toDateString()}`);

    doc.moveDown();
    doc.text('This is a system generated diagnostic report.');

    doc.end();
  } catch (error) {
    res.status(500).json({
      message: 'Failed to download report',
      error: error.message,
    });
  }
};

module.exports = {
  createReport,
  getAllReports,
  getReportHistory,
  downloadReport,
};