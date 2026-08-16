const mongoose = require('mongoose');

// One emergency blood request submission fans out into one DonationRequest document per
// matched donor (see library/donorMatching.js + controllers/donationRequestController.js
// createEmergencyRequest), so each donor can independently Accept/Reject. `requestGroupId`
// ties all the fan-out documents from a single submission back together.
const DonationRequestSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor',
    required: true, // the donor this request has been made available to
  },
  requestGroupId: {
    type: String,
    required: true,
    index: true,
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // the patient/hospital_staff user who submitted the emergency request
  },
  distanceKm: {
    type: Number,
    default: null, // distance from the request location to this donor at match time; null if either location could not be geocoded
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
