const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'DiagnosticTest', required: true },
  sampleId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  testName: { type: String, required: true },
  observedValue: { type: Number, required: true },
  unit: { type: String, required: true },
  referenceRange: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  flag: { 
    type: String, 
    required: true,
    enum: ['Normal', 'High', 'Low', 'Abnormal'] 
  }
  ,
  approvalStatus: {
    type: String,
    enum: ['Pending Approval', 'Approved', 'Rejected'],
    default: 'Pending Approval',
  },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: String, default: null },
  approvedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectionReason: { type: String, default: null },
  approvedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Result', ResultSchema);
