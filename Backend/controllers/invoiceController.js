const PDFDocument = require('pdfkit');
const Booking = require('../models/Booking');

const downloadInvoice = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (req.user.role === 'patient' && String(booking.patient) !== req.user.id) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    if (booking.paymentStatus !== 'paid') {
      return res.status(409).json({ message: 'Invoice is only available after successful payment.' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${booking._id}.pdf`);
    doc.pipe(res);

    doc.fontSize(22).text('MediLab Connect', { align: 'center' });
    doc.fontSize(15).text('Payment Invoice', { align: 'center' });
    doc.moveDown(1.5);

    doc.font('Helvetica-Bold').text('Transaction ID: ', { continued: true });
    doc.font('Helvetica').text(booking.transactionId || 'N/A');
    doc.font('Helvetica-Bold').text('Booking Date: ', { continued: true });
    doc.font('Helvetica').text(new Date(booking.createdAt).toLocaleDateString());
    doc.font('Helvetica-Bold').text('Patient: ', { continued: true });
    doc.font('Helvetica').text(booking.patientInfo.fullName);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Tests');
    doc.moveDown(0.3);
    for (const test of booking.tests) {
      doc.font('Helvetica').text(`${test.testName}  —  ${test.price} BDT`);
    }
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Total Paid: ', { continued: true });
    doc.font('Helvetica').text(`${booking.paymentDetails.amount ?? booking.totalPrice} BDT`);
    doc.font('Helvetica-Bold').text('Paid On: ', { continued: true });
    doc.font('Helvetica').text(
      booking.paymentDetails.paidAt ? new Date(booking.paymentDetails.paidAt).toLocaleString() : 'N/A'
    );

    doc.moveDown();
    doc.fontSize(10).fillColor('#666666').text('This is a system-generated invoice.', { align: 'center' });
    doc.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to generate invoice', error: error.message });
    }
  }
};

module.exports = { downloadInvoice };