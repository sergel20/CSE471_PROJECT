const Booking = require('../models/Booking');
const bkash = require('../library/bkashClient');

const initiatePayment = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.bookingId, patient: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.paymentStatus === 'paid') {
      return res.status(409).json({ message: 'This booking has already been paid.' });
    }

    const payment = await bkash.createPayment({
      amount: booking.totalPrice,
      invoiceNumber: String(booking._id),
      payerReference: booking.patientInfo.phone,
      callbackURL: process.env.BKASH_CALLBACK_URL,
    });

    booking.paymentDetails.bkashPaymentID = payment.paymentId;
    await booking.save();

    res.status(200).json({ bkashURL: payment.bkashURL, paymentId: payment.paymentId });
  } catch (error) {
    res.status(502).json({ message: 'Failed to initiate payment', error: error.message });
  }
};

const paymentCallback = async (req, res) => {
  const { paymentID, status } = req.query;
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const booking = await Booking.findOne({ 'paymentDetails.bkashPaymentID': paymentID });
    if (!booking) {
      return res.redirect(`${frontendBase}/payment-result?status=error&message=BookingNotFound`);
    }

    if (status !== 'success') {
      booking.paymentStatus = 'failed';
      await booking.save();
      return res.redirect(`${frontendBase}/payment-result?status=${status}&bookingId=${booking._id}`);
    }

    const result = await bkash.executePayment(paymentID);

    if (result.transactionStatus === 'Completed') {
      booking.paymentStatus = 'paid';
      booking.transactionId = result.trxId;
      booking.paymentDetails.amount = Number(result.amount);
      booking.paymentDetails.paidAt = new Date();
      await booking.save();
      return res.redirect(`${frontendBase}/payment-result?status=success&bookingId=${booking._id}`);
    }

    booking.paymentStatus = 'failed';
    await booking.save();
    res.redirect(`${frontendBase}/payment-result?status=failed&bookingId=${booking._id}`);
  } catch (error) {
    res.redirect(`${frontendBase}/payment-result?status=error&message=${encodeURIComponent(error.message)}`);
  }
};

const markRefunded = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.paymentStatus !== 'paid') {
      return res.status(409).json({ message: 'Only a paid booking can be refunded.' });
    }
    booking.paymentStatus = 'refunded';
    await booking.save();
    res.status(200).json({ message: 'Booking marked as refunded.', booking });
  } catch (error) {
    res.status(500).json({ message: 'Error processing refund', error: error.message });
  }
};

module.exports = { initiatePayment, paymentCallback, markRefunded };