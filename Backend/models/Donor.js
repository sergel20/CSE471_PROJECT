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
  // GeoJSON coordinates for `location`, resolved via Nominatim whenever location is set/changed
  // (see donorController.upsertMyDonor). `location` itself stays plain text for display; this
  // is what nearby-donor matching actually queries against ($geoNear needs a 2dsphere index).
  geoLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: undefined,
    },
  },
  available: {
    type: Boolean,
    default: true, // whether the donor is currently willing to be matched to emergency requests
  },
  lastDonationDate: {
    type: Date,
    default: null,
    // null means the donor has never donated before. Settable by the donor ONLY at initial
    // profile creation (their prior donation history); after that it can only change when an
    // incoming donation request is accepted (see donationRequestController.acceptRequest) —
    // never through the normal profile-update endpoint.
  },
}, {
  timestamps: true,
});

DonorSchema.index({ geoLocation: '2dsphere' });

// Computes whether a donor currently meets all eligibility criteria to donate blood.
// Deliberately simple and centralized here: age range + minimum gap since last donation.
// Change MIN_DONATION_AGE / MAX_DONATION_AGE / MIN_DAYS_BETWEEN_DONATIONS above to adjust the rule.
// Exported as a plain function (not just a schema method) so donor-matching can run it against
// the plain objects returned by lean()/aggregate() queries, not just hydrated documents.
function computeEligibility(donor) {
  const reasons = [];
  let nextEligibleDate = null;

  if (donor.age < MIN_DONATION_AGE || donor.age > MAX_DONATION_AGE) {
    reasons.push(`Donor age must be between ${MIN_DONATION_AGE} and ${MAX_DONATION_AGE} years.`);
  }

  if (donor.lastDonationDate) {
    const msSinceLastDonation = Date.now() - new Date(donor.lastDonationDate).getTime();
    const daysSinceLastDonation = Math.floor(msSinceLastDonation / (1000 * 60 * 60 * 24));

    if (daysSinceLastDonation < MIN_DAYS_BETWEEN_DONATIONS) {
      nextEligibleDate = new Date(donor.lastDonationDate);
      nextEligibleDate.setDate(nextEligibleDate.getDate() + MIN_DAYS_BETWEEN_DONATIONS);
      reasons.push(
        `Must wait ${MIN_DAYS_BETWEEN_DONATIONS - daysSinceLastDonation} more day(s) since last donation.`
      );
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    nextEligibleDate,
  };
}

DonorSchema.methods.getEligibility = function () {
  return computeEligibility(this);
};

module.exports = mongoose.model('Donor', DonorSchema);
module.exports.computeEligibility = computeEligibility;
