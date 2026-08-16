const Donor = require('../models/Donor');
const DonationHistory = require('../models/DonationHistory');
const DonationRequest = require('../models/DonationRequest');
const { geocodeLocation } = require('../library/geocode');

// Fields the normal profile-update endpoint is allowed to touch. lastDonationDate is
// donor-editable (e.g. to correct it or log a donation made outside the app) — accepting
// a donation request (see donationRequestController.acceptRequest) also sets it automatically.
const EDITABLE_FIELDS = ['fullName', 'bloodGroup', 'age', 'phone', 'location', 'available', 'lastDonationDate'];

function pickEditableFields(source) {
  const picked = {};
  for (const field of EDITABLE_FIELDS) {
    if (source[field] !== undefined) picked[field] = source[field];
  }
  return picked;
}

// Attaches the calculated eligibility result to a donor document before sending it to the client.
// Exported for reuse by donationRequestController, which needs the same shape after Accept.
function withEligibility(donor) {
  const obj = donor.toObject();
  obj.eligibility = donor.getEligibility();
  return obj;
}

// Mongo raises a duplicate-key error (code 11000) when a unique constraint is violated;
// surface that as a clear message instead of the raw driver error.
function isDuplicateKeyError(error, field) {
  return error.code === 11000 && error.keyPattern && error.keyPattern[field];
}

// GET: Fetch the logged-in user's own donor profile
const getMyDonor = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id });
    if (!donor) {
      return res.status(404).json({ message: 'You have not created a donor profile yet.' });
    }
    res.status(200).json(withEligibility(donor));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching donor profile', error: error.message });
  }
};

// PUT: Create or update the logged-in user's own profile information (one profile per
// account, so this always updates the same record). Only EDITABLE_FIELDS are ever written,
// so things like `user` can't be touched through this endpoint.
const upsertMyDonor = async (req, res) => {
  try {
    const updates = pickEditableFields(req.body);

    if (updates.lastDonationDate !== undefined) {
      if (!updates.lastDonationDate) {
        updates.lastDonationDate = null;
      } else {
        const parsedDate = new Date(updates.lastDonationDate);
        if (Number.isNaN(parsedDate.getTime()) || parsedDate > new Date()) {
          return res.status(400).json({ message: 'Last donation date must be a valid date in the past.' });
        }
        updates.lastDonationDate = parsedDate;
      }
    }

    let donor = await Donor.findOne({ user: req.user.id });
    const locationChanged = !donor || (updates.location !== undefined && updates.location !== donor.location);

    if (donor) {
      Object.assign(donor, updates);
    } else {
      donor = new Donor({ ...updates, user: req.user.id });
    }

    // Re-resolve coordinates whenever the donor's location text changes, so nearby-donor
    // matching (library/donorMatching.js) can find them. Geocoding failure isn't fatal —
    // the profile still saves with its previous/absent coordinates; the donor just won't
    // surface in distance-ranked matches until it succeeds on a later save.
    if (locationChanged && donor.location) {
      const geo = await geocodeLocation(donor.location);
      if (geo) {
        donor.geoLocation = { type: 'Point', coordinates: [geo.lon, geo.lat] };
      }
    }

    const saved = await donor.save();
    res.status(200).json(withEligibility(saved));
  } catch (error) {
    if (isDuplicateKeyError(error, 'phone')) {
      return res.status(409).json({
        message: 'Another donor profile is already using this phone number.',
      });
    }
    res.status(400).json({ message: 'Error saving donor profile', error: error.message });
  }
};

// DELETE: Delete the logged-in user's own donor profile
const deleteMyDonor = async (req, res) => {
  try {
    const deleted = await Donor.findOneAndDelete({ user: req.user.id });
    if (!deleted) {
      return res.status(404).json({ message: 'You have not created a donor profile yet.' });
    }
    await DonationHistory.deleteMany({ donor: deleted._id });
    await DonationRequest.deleteMany({ donor: deleted._id });
    res.status(200).json({ message: 'Donor profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting donor profile', error: error.message });
  }
};

// GET: List the logged-in user's past donation records, most recent first
const getMyDonationHistory = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id });
    if (!donor) {
      return res.status(404).json({ message: 'You have not created a donor profile yet.' });
    }
    const history = await DonationHistory.find({ donor: donor._id }).sort({ donationDate: -1 });
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching donation history', error: error.message });
  }
};

module.exports = {
  getMyDonor,
  upsertMyDonor,
  deleteMyDonor,
  getMyDonationHistory,
  withEligibility,
};
