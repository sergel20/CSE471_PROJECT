const Donor = require('../models/Donor');

// Attaches the calculated eligibility result to a donor document before sending it to the client.
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

// PUT: Create or update the logged-in user's own donor profile (one profile per account,
// so changing a phone number or any other field always updates the same record).
const upsertMyDonor = async (req, res) => {
  try {
    let donor = await Donor.findOne({ user: req.user.id });
    if (donor) {
      Object.assign(donor, req.body);
    } else {
      donor = new Donor({ ...req.body, user: req.user.id });
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
    res.status(200).json({ message: 'Donor profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting donor profile', error: error.message });
  }
};

module.exports = {
  getMyDonor,
  upsertMyDonor,
  deleteMyDonor,
};
