const mongoose = require('mongoose');

// Standard blood-donation eligibility thresholds
const MIN_DONATION_AGE = 18;
const MAX_DONATION_AGE = 65;
const MIN_DAYS_BETWEEN_DONATIONS = 90; // Minimum gap required between two whole-blood donations

const DonorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // One donor profile per user account
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  bloodGroup: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  },
  age: {
    type: Number,
    required: true,
    min: 0,
    max: 120,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    unique: true, // One donor profile per phone number; update the existing profile instead of creating a new one
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  lastDonationDate: {
    type: Date,
    default: null, // null means the donor has never donated before
  },
  healthStatus: {
    type: String,
    required: true,
    enum: ['Healthy', 'Minor Illness', 'Chronic Condition', 'Not Fit'],
    default: 'Healthy',
  },
  availability: {
    type: Boolean,
    default: true, // Donor's self-reported willingness to be contacted for donation
  },
}, {
  timestamps: true,
});

// Computes whether the donor currently meets all eligibility criteria to donate blood.
DonorSchema.methods.getEligibility = function () {
  const reasons = [];
  let nextEligibleDate = null;

  if (this.age < MIN_DONATION_AGE || this.age > MAX_DONATION_AGE) {
    reasons.push(`Donor age must be between ${MIN_DONATION_AGE} and ${MAX_DONATION_AGE} years.`);
  }

  if (this.healthStatus !== 'Healthy') {
    reasons.push(`Health status must be "Healthy" to donate (currently "${this.healthStatus}").`);
  }

  if (this.lastDonationDate) {
    const msSinceLastDonation = Date.now() - new Date(this.lastDonationDate).getTime();
    const daysSinceLastDonation = Math.floor(msSinceLastDonation / (1000 * 60 * 60 * 24));

    if (daysSinceLastDonation < MIN_DAYS_BETWEEN_DONATIONS) {
      nextEligibleDate = new Date(this.lastDonationDate);
      nextEligibleDate.setDate(nextEligibleDate.getDate() + MIN_DAYS_BETWEEN_DONATIONS);
      reasons.push(
        `Must wait ${MIN_DAYS_BETWEEN_DONATIONS - daysSinceLastDonation} more day(s) since last donation.`
      );
    }
  }

  if (!this.availability) {
    reasons.push('Donor has marked themselves as unavailable.');
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    nextEligibleDate,
  };
};

module.exports = mongoose.model('Donor', DonorSchema);
