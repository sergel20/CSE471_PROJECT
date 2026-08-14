const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
  sampleId: { type: String, required: true },
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
  approvedBy: { type: String, default: null },
  rejectionReason: { type: String, default: null },
  approvedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Result', ResultSchema);