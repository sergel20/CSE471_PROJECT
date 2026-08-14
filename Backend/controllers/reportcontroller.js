const PDFDocument = require('pdfkit');
const Result = require('../models/Result');

function patientOwnsResult(result, userId) {
  return result.booking && String(result.booking.patient) === String(userId);
}

async function findApprovedResult(resultId) {
  return Result.findOne({ _id: resultId, approvalStatus: 'Approved' })
    .populate('booking')
    .populate('test', 'sampleType estimatedDeliveryHours');
}

const getMyReports = async (req, res) => {
  try {
    const results = await Result.find({ approvalStatus: 'Approved' })
      .populate({
        path: 'booking',
        match: { patient: req.user.id },
        select: 'patient patientInfo preferredDate confirmedAt',
      })
      .sort({ approvedAt: -1 });

    res.status(200).json(results.filter((result) => result.booking));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch report history', error: error.message });
  }
};

const getReport = async (req, res) => {
  try {
    const result = await findApprovedResult(req.params.id);
    if (!result) return res.status(404).json({ message: 'Approved report not found.' });
    if (req.user.role === 'patient' && !patientOwnsResult(result, req.user.id)) {
      return res.status(404).json({ message: 'Approved report not found.' });
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch report', error: error.message });
  }
};

const downloadReport = async (req, res) => {
  try {
    const result = await findApprovedResult(req.params.id);
    if (!result) return res.status(404).json({ message: 'Approved report not found.' });
    if (req.user.role === 'patient' && !patientOwnsResult(result, req.user.id)) {
      return res.status(404).json({ message: 'Approved report not found.' });
    }

    const booking = result.booking;
    if (!booking) return res.status(409).json({ message: 'Report booking information is missing.' });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${result.sampleId}.pdf`);
    doc.pipe(res);

    doc.fontSize(22).text('MediLab Connect', { align: 'center' });
    doc.fontSize(15).text('Approved Diagnostic Report', { align: 'center' });
    doc.moveDown(1.5);

    const rows = [
      ['Patient Name', booking.patientInfo.fullName],
      ['Phone', booking.patientInfo.phone],
      ['Email', booking.patientInfo.email],
      ['Sample ID', result.sampleId],
      ['Sample Type', result.test?.sampleType || 'N/A'],
      ['Test Name', result.testName],
      ['Result', `${result.observedValue} ${result.unit}`],
      ['Reference Range', `${result.referenceRange.min} - ${result.referenceRange.max} ${result.unit}`],
      ['Result Flag', result.flag],
      ['Approval Status', result.approvalStatus],
      ['Approved By', result.approvedBy || 'Doctor'],
      ['Approved On', result.approvedAt ? new Date(result.approvedAt).toLocaleString() : 'N/A'],
      ['Booking Date', new Date(booking.createdAt).toLocaleDateString()],
    ];

    for (const [label, value] of rows) {
      doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
      doc.font('Helvetica').text(String(value));
      doc.moveDown(0.35);
    }

    doc.moveDown();
    doc.fontSize(10).fillColor('#666666').text('This is a system-generated report.', { align: 'center' });
    doc.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to download report', error: error.message });
    }
  }
};

module.exports = { getMyReports, getReport, downloadReport };
