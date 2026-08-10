const Donor = require('../models/Donor');
const DonationRequest = require('../models/DonationRequest');
const DonationHistory = require('../models/DonationHistory');
const { withEligibility } = require('./donorController');

// Looks up the request and, if the atomic status-flip failed, figures out why (not found /
// not owned by this donor / already responded) so the caller can return the right error.
async function diagnoseFailedResponse(requestId, donorId) {
  const existing = await DonationRequest.findById(requestId);
  if (!existing) {
    return { status: 404, message: 'Donation request not found.' };
  }
  if (existing.donor.toString() !== donorId.toString()) {
    return { status: 403, message: 'This request is not assigned to you.' };
  }
  return { status: 409, message: 'This request has already been responded to.' };
}

// GET: List donation requests currently pending for the logged-in donor
const getMyRequests = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id });
    if (!donor) {
      return res.status(404).json({ message: 'You have not created a donor profile yet.' });
    }
    const requests = await DonationRequest.find({ donor: donor._id, status: 'Pending' }).sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching donation requests', error: error.message });
  }
};

// PUT: Accept a donation request assigned to the logged-in donor. Treated as donation
// completed immediately — no separate confirm step. Eligibility is (re)checked here, on the
// backend, using the donor's current data before anything is written — an ineligible donor's
// Accept is refused outright. The status flip is atomic (only succeeds if the request is
// currently Pending and owned by this donor), which is what makes it impossible to accept
// the same request twice, including under concurrent requests.
const acceptRequest = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id });
    if (!donor) {
      return res.status(404).json({ message: 'You have not created a donor profile yet.' });
    }

    const eligibility = donor.getEligibility();
    if (!eligibility.eligible) {
      return res.status(400).json({
        message: 'You are not currently eligible to donate.',
        eligibility,
      });
    }

    const request = await DonationRequest.findOneAndUpdate(
      { _id: req.params.id, donor: donor._id, status: 'Pending' },
      { status: 'Accepted', respondedAt: new Date() },
      { new: true }
    );

    if (!request) {
      const failure = await diagnoseFailedResponse(req.params.id, donor._id);
      return res.status(failure.status).json({ message: failure.message });
    }

    // Donation date always comes from the backend clock — the donor never supplies it.
    const donationDate = new Date();
    const donation = await DonationHistory.create({ donor: donor._id, donationDate, request: request._id });

    if (!donor.lastDonationDate || donationDate > donor.lastDonationDate) {
      donor.lastDonationDate = donationDate;
      await donor.save();
    }

    res.status(200).json({
      message: 'Donation request accepted. Donation recorded.',
      request,
      donation,
      donor: withEligibility(donor),
    });
  } catch (error) {
    res.status(400).json({ message: 'Error accepting donation request', error: error.message });
  }
};

// PUT: Reject a donation request assigned to the logged-in donor. No DonationHistory is
// created and lastDonationDate/eligibility are left untouched.
const rejectRequest = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id });
    if (!donor) {
      return res.status(404).json({ message: 'You have not created a donor profile yet.' });
    }

    const request = await DonationRequest.findOneAndUpdate(
      { _id: req.params.id, donor: donor._id, status: 'Pending' },
      { status: 'Rejected', respondedAt: new Date() },
      { new: true }
    );

    if (!request) {
      const failure = await diagnoseFailedResponse(req.params.id, donor._id);
      return res.status(failure.status).json({ message: failure.message });
    }

    res.status(200).json({ message: 'Donation request rejected.', request });
  } catch (error) {
    res.status(400).json({ message: 'Error rejecting donation request', error: error.message });
  }
};

module.exports = {
  getMyRequests,
  acceptRequest,
  rejectRequest,
};
