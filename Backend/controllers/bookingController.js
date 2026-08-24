const mongoose = require('mongoose');
const DiagnosticTest = require('../models/DiagnosticTest');
const Booking = require('../models/Booking');
const User = require('../models/User');
const generateSampleId = require('../library/sampleId');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function resolveBookingInput(testIds, patientInfo) {
  if (!Array.isArray(testIds) || testIds.length === 0) {
    const error = new Error('At least one test must be selected.');
    error.status = 400;
    throw error;
  }

  const uniqueIds = [...new Set(testIds)];
  if (uniqueIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    const error = new Error('One or more test IDs are invalid.');
    error.status = 400;
    throw error;
  }

  if (!patientInfo || typeof patientInfo !== 'object') {
    const error = new Error('Patient information is required.');
    error.status = 400;
    throw error;
  }

  const { fullName, phone, email, address, preferredDate } = patientInfo;
  if (!fullName || !fullName.trim()) {
    const error = new Error('Full name is required.');
    error.status = 400;
    throw error;
  }
  if (!phone || !phone.trim()) {
    const error = new Error('Phone number is required.');
    error.status = 400;
    throw error;
  }
  if (!email || !EMAIL_REGEX.test(email.trim())) {
    const error = new Error('A valid email is required.');
    error.status = 400;
    throw error;
  }
  if (!address || !address.trim()) {
    const error = new Error('Address is required.');
    error.status = 400;
    throw error;
  }
  if (!preferredDate || Number.isNaN(Date.parse(preferredDate))) {
    const error = new Error('A valid preferred date is required.');
    error.status = 400;
    throw error;
  }

  const parsedDate = new Date(preferredDate);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (parsedDate < startOfToday) {
    const error = new Error('Preferred date cannot be in the past.');
    error.status = 400;
    throw error;
  }

  const tests = await DiagnosticTest.find({ _id: { $in: uniqueIds } });
  if (tests.length !== uniqueIds.length) {
    const error = new Error('One or more selected tests could not be found.');
    error.status = 404;
    throw error;
  }

  // Preserve the order selected by the patient.
  const byId = new Map(tests.map((test) => [String(test._id), test]));
  const orderedTests = uniqueIds.map((id) => byId.get(String(id)));
  const totalPrice = orderedTests.reduce((sum, test) => sum + test.price, 0);

  return {
    tests: orderedTests,
    patientInfo: {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      address: address.trim(),
    },
    preferredDate: parsedDate,
    totalPrice,
  };
}

function sendInputError(res, error, fallback) {
  return res.status(error.status || 500).json({
    message: error.status ? error.message : fallback,
    ...(error.status ? {} : { error: error.message }),
  });
}

// Price/review preview only. This endpoint intentionally performs no database write.
const previewBooking = async (req, res) => {
  try {
    const details = await resolveBookingInput(req.body.testIds, req.body.patientInfo);
    res.status(200).json({ ...details, paymentStatus: 'pending' });
  } catch (error) {
    sendInputError(res, error, 'Error generating booking preview');
  }
};

// The patient clicks Proceed to Payment. Until a real payment gateway is connected,
// this creates a payment-confirmation request for the admin dashboard.
const createBookingRequest = async (req, res) => {
  try {
    const details = await resolveBookingInput(req.body.testIds, req.body.patientInfo);
    const booking = await Booking.create({
      patient: req.user.id,
      tests: details.tests.map((test) => ({
        test: test._id,
        testName: test.testName,
        sampleType: test.sampleType,
        price: test.price,
        unit: test.unit,
        referenceRange: test.referenceRange,
      })),
      patientInfo: details.patientInfo,
      preferredDate: details.preferredDate,
      totalPrice: details.totalPrice,
      paymentStatus: 'pending',
      bookingStatus: 'Pending Confirmation',
    });

    res.status(201).json({
      message: 'Payment confirmation request sent to the admin.',
      booking,
    });
  } catch (error) {
    sendInputError(res, error, 'Error submitting booking request');
  }
};

const getAdminBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('patient', 'name email')
      .populate('confirmedBy', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error loading booking requests', error: error.message });
  }
};

const confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    if (booking.bookingStatus === 'Confirmed') {
      return res.status(200).json({ message: 'Booking is already confirmed.', booking });
    }
    if (booking.paymentStatus !== 'paid') {
      return res.status(409).json({ message: 'This booking has not been paid yet. The patient must complete payment first.' });
    }

    const admin = await User.findById(req.user.id).select('name');
    const updatedBy = admin?.name || 'Admin';

    // Backfill copied test metadata for booking requests created by the previous schema.
    const diagnosticTests = await DiagnosticTest.find({
      _id: { $in: booking.tests.map((bookedTest) => bookedTest.test) },
    });
    const diagnosticById = new Map(diagnosticTests.map((test) => [String(test._id), test]));

    for (const bookedTest of booking.tests) {
      const diagnosticTest = diagnosticById.get(String(bookedTest.test));
      if (!diagnosticTest) {
        return res.status(409).json({
          message: `Diagnostic test ${bookedTest.testName} no longer exists.`,
        });
      }
      bookedTest.sampleType = bookedTest.sampleType || diagnosticTest.sampleType;
      bookedTest.unit = bookedTest.unit || diagnosticTest.unit;
      if (bookedTest.referenceRange?.min === undefined || bookedTest.referenceRange?.max === undefined) {
        bookedTest.referenceRange = diagnosticTest.referenceRange;
      }
      bookedTest.sampleId = await generateSampleId();
      bookedTest.sampleStatus = 'Booked';
      bookedTest.statusHistory.push({ status: 'Booked', updatedBy });
    }

   
    booking.bookingStatus = 'Confirmed';
    booking.confirmedBy = req.user.id;
    booking.confirmedAt = new Date();
    await booking.save();

    res.status(200).json({
      message: `${booking.tests.length} sample ID${booking.tests.length === 1 ? '' : 's'} generated and booking confirmed.`,
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error confirming booking', error: error.message });
  }
};

module.exports = {
  previewBooking,
  createBookingRequest,
  getAdminBookings,
  confirmBooking,
};
