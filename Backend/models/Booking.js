const mongoose = require('mongoose');

const SAMPLE_STATUSES = [
  'Booked',
  'Sample Collected',
  'Received in Lab',
  'Under Processing',
  'Result Ready',
  'Approved',
];

const StatusHistorySchema = new mongoose.Schema({
  status: { type: String, enum: SAMPLE_STATUSES, required: true },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, required: true },
}, { _id: false });

const BookedTestSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'DiagnosticTest', required: true },
  testName: { type: String, required: true },
  sampleType: { type: String, required: true },
  price: { type: Number, required: true },
  unit: { type: String, required: true },
  referenceRange: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
  },
  // A selected test becomes a trackable sample only after an admin confirms payment.
  sampleId: { type: String, trim: true, uppercase: true },
  sampleStatus: { type: String, enum: SAMPLE_STATUSES },
  statusHistory: { type: [StatusHistorySchema], default: [] },
  result: { type: mongoose.Schema.Types.ObjectId, ref: 'Result', default: null },
});

const BookingSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  tests: {
    type: [BookedTestSchema],
    validate: [(tests) => Array.isArray(tests) && tests.length > 0, 'At least one test is required.'],
  },
  patientInfo: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    address: { type: String, required: true },
  },
  preferredDate: { type: Date, required: true },
  totalPrice: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  bookingStatus: {
    type: String,
    enum: ['Pending Confirmation', 'Confirmed', 'Cancelled'],
    default: 'Pending Confirmation',
  },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  confirmedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

BookingSchema.index(
  { 'tests.sampleId': 1 },
  {
    unique: true,
    partialFilterExpression: { 'tests.sampleId': { $type: 'string' } },
  }
);

module.exports = mongoose.model('Booking', BookingSchema);
module.exports.SAMPLE_STATUSES = SAMPLE_STATUSES;
