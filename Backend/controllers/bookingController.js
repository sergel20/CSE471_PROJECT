const mongoose = require('mongoose');
const DiagnosticTest = require('../models/DiagnosticTest');
const Booking = require('../models/Booking');

// Basic email/phone sanity checks (frontend already enforces stricter UX validation)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST: Validate a selection of tests + patient info, calculate the total from MongoDB
// prices, and save the booking with paymentStatus 'pending' (payment isn't implemented yet).
const previewBooking = async (req, res) => {
  try {
    const { testIds, patientInfo } = req.body;

    if (!Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({ message: 'At least one test must be selected.' });
    }

    const invalidIds = testIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ message: 'One or more test IDs are invalid.' });
    }

    if (!patientInfo || typeof patientInfo !== 'object') {
      return res.status(400).json({ message: 'Patient information is required.' });
    }

    const { fullName, phone, email, address, preferredDate } = patientInfo;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: 'Full name is required.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ message: 'A valid email is required.' });
    }
    if (!address || !address.trim()) {
      return res.status(400).json({ message: 'Address is required.' });
    }
    if (!preferredDate || isNaN(Date.parse(preferredDate))) {
      return res.status(400).json({ message: 'A valid preferred date is required.' });
    }

    const parsedDate = new Date(preferredDate);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (parsedDate < startOfToday) {
      return res.status(400).json({ message: 'Preferred date cannot be in the past.' });
    }

    // Fetch tests straight from MongoDB so pricing can never be trusted from the client.
    const uniqueIds = [...new Set(testIds)];
    const tests = await DiagnosticTest.find({ _id: { $in: uniqueIds } });

    if (tests.length !== uniqueIds.length) {
      return res.status(404).json({ message: 'One or more selected tests could not be found.' });
    }

    const totalPrice = tests.reduce((sum, test) => sum + test.price, 0);

    const booking = await Booking.create({
      tests: tests.map((test) => ({ test: test._id, testName: test.testName, price: test.price })),
      patientInfo: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
      },
      preferredDate: parsedDate,
      totalPrice,
      paymentStatus: 'pending',
    });

    res.status(201).json({
      bookingId: booking._id,
      tests,
      patientInfo: booking.patientInfo,
      preferredDate: booking.preferredDate,
      totalPrice: booking.totalPrice,
      paymentStatus: booking.paymentStatus,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating booking preview', error: error.message });
  }
};

module.exports = { previewBooking };
