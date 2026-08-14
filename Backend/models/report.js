const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    sampleId: {
      type: String,
      required: true,
      trim: true,
    },
    testName: {
      type: String,
      required: true,
      trim: true,
    },
    resultValue: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    referenceRange: {
      type: String,
      required: true,
      trim: true,
    },
    resultFlag: {
      type: String,
      enum: ['Normal', 'High', 'Low', 'Abnormal'],
      default: 'Normal',
    },
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    reportDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;