const mongoose = require('mongoose');

const DonationHistorySchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor',
    required: true,
  },
  donationDate: {
    type: Date,
    required: true,
  },
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DonationRequest',
    default: null, // set when this donation fulfilled an incoming donation request
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('DonationHistory', DonationHistorySchema);
