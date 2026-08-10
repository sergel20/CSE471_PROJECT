const mongoose = require('mongoose');

// Minimal shared data contract for donation requests. Creating requests and matching them
// to nearby donors is owned by another feature — this model only carries the fields the
// donor-side Accept/Reject flow needs to display and act on.
const DonationRequestSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor',
    required: true, // the donor this request has been made available to
  },
  bloodGroup: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  },
  component: {
    type: String,
    required: true,
    trim: true, // e.g. 'Whole Blood', 'Plasma', 'Platelets'
  },
  requiredUnits: {
    type: Number,
    required: true,
    min: 1,
  },
  hospital: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  urgency: {
    type: String,
    required: true,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  contact: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected'],
    default: 'Pending',
  },
  respondedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('DonationRequest', DonationRequestSchema);
