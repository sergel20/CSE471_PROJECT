const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const DiagnosticTest = require('../models/DiagnosticTest');
const Result = require('../models/Result');
const { previewBooking } = require('../controllers/bookingController');

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('booking preview calculates server pricing without writing a booking', async (context) => {
  const testId = new mongoose.Types.ObjectId();
  context.mock.method(DiagnosticTest, 'find', async () => [{
    _id: testId,
    testName: 'CBC',
    sampleType: 'Blood',
    unit: 'g/dL',
    referenceRange: { min: 12, max: 16 },
    price: 500,
  }]);
  const createMock = context.mock.method(Booking, 'create', async () => {
    throw new Error('Preview must not create a booking.');
  });

  const req = {
    body: {
      testIds: [String(testId)],
      patientInfo: {
        fullName: 'Test Patient',
        phone: '01700000000',
        email: 'patient@example.com',
        address: 'Dhaka',
        preferredDate: new Date(Date.now() + 86400000).toISOString(),
      },
    },
  };
  const res = responseRecorder();
  await previewBooking(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.totalPrice, 500);
  assert.equal(res.body.paymentStatus, 'pending');
  assert.equal(createMock.mock.callCount(), 0);
});

test('confirmed booking validates one independently tracked sample per selected test', async () => {
  const patientId = new mongoose.Types.ObjectId();
  const diagnosticTestId = new mongoose.Types.ObjectId();
  const booking = new Booking({
    patient: patientId,
    tests: [{
      test: diagnosticTestId,
      testName: 'CBC',
      sampleType: 'Blood',
      price: 500,
      unit: 'g/dL',
      referenceRange: { min: 12, max: 16 },
      sampleId: 'LAB-2026-0001',
      sampleStatus: 'Booked',
      statusHistory: [{ status: 'Booked', updatedBy: 'Admin' }],
    }],
    patientInfo: {
      fullName: 'Test Patient',
      phone: '01700000000',
      email: 'patient@example.com',
      address: 'Dhaka',
    },
    preferredDate: new Date(Date.now() + 86400000),
    totalPrice: 500,
    paymentStatus: 'paid',
    bookingStatus: 'Confirmed',
  });

  await booking.validate();
  assert.equal(booking.tests.length, 1);
  assert.equal(booking.tests[0].sampleId, 'LAB-2026-0001');
});

test('new result is linked to booking and begins pending doctor approval', async () => {
  const result = new Result({
    booking: new mongoose.Types.ObjectId(),
    test: new mongoose.Types.ObjectId(),
    sampleId: 'LAB-2026-0001',
    testName: 'CBC',
    observedValue: 14,
    unit: 'g/dL',
    referenceRange: { min: 12, max: 16 },
    flag: 'Normal',
    enteredBy: new mongoose.Types.ObjectId(),
  });

  await result.validate();
  assert.equal(result.approvalStatus, 'Pending Approval');
});
