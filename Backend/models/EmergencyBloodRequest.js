const mongoose = require('mongoose');

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PRIORITIES = ['Critical', 'High', 'Normal'];
const REQUEST_STATUSES = ['Submitted', 'Under Verification', 'In Progress', 'Blood Arranged', 'Completed', 'Cancelled'];

const progressUpdateSchema = new mongoose.Schema({
  note: { type: String, required: true, trim: true, maxlength: 500 },
  status: { type: String, required: true, enum: REQUEST_STATUSES },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedByRole: { type: String, required: true, enum: ['hospital_staff', 'admin'] },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  fromStatus: { type: String, enum: REQUEST_STATUSES, default: null },
  toStatus: { type: String, required: true, enum: REQUEST_STATUSES },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedByRole: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const emergencyBloodRequestSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bloodGroup: { type: String, required: true, enum: BLOOD_GROUPS },
  componentType: { type: String, required: true, trim: true, maxlength: 100 },
  requiredUnits: {
    type: Number,
    required: true,
    min: 1,
    validate: { validator: Number.isInteger, message: 'Required units must be a whole number.' },
  },
  hospitalName: { type: String, required: true, trim: true, maxlength: 200 },
  location: { type: String, required: true, trim: true, maxlength: 300 },
  contactNumber: { type: String, required: true, trim: true, maxlength: 30 },
  urgencyLevel: { type: String, required: true, enum: PRIORITIES, default: 'Normal', index: true },
  requiredBy: { type: Date, required: true },
  additionalNotes: { type: String, trim: true, maxlength: 1000, default: '' },
  requestStatus: { type: String, required: true, enum: REQUEST_STATUSES, default: 'Submitted', index: true },
  latestProgressNote: { type: String, trim: true, maxlength: 500, default: '' },
  progressUpdates: { type: [progressUpdateSchema], default: [] },
  statusHistory: { type: [statusHistorySchema], default: [] },
}, { timestamps: true });

emergencyBloodRequestSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('EmergencyBloodRequest', emergencyBloodRequestSchema);
module.exports.BLOOD_GROUPS = BLOOD_GROUPS;
module.exports.PRIORITIES = PRIORITIES;
module.exports.REQUEST_STATUSES = REQUEST_STATUSES;
