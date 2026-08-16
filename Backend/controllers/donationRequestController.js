const crypto = require('crypto');
const Donor = require('../models/Donor');
const DonationRequest = require('../models/DonationRequest');
const DonationHistory = require('../models/DonationHistory');
const { withEligibility } = require('./donorController');
const { findMatchingDonors } = require('../library/donorMatching');

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const REQUIRED_REQUEST_FIELDS = ['bloodGroup', 'component', 'requiredUnits', 'hospital', 'location', 'urgency', 'contact'];

// Shared by search and send — checks the request-detail fields are present and valid.
function validateRequestFields(body) {
  const missing = REQUIRED_REQUEST_FIELDS.filter((field) => body[field] === undefined || body[field] === '');
  if (missing.length > 0) {
    return `Missing required field(s): ${missing.join(', ')}`;
  }
  if (!BLOOD_GROUPS.includes(body.bloodGroup)) {
    return 'Invalid blood group.';
  }
  return null;
}

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

// Shapes a matched-donor entry for API responses, whichever source it came from
// (a freshly matched Donor document, or a saved DonationRequest populated with its donor).
function formatMatch({ requestId, donor, distanceKm, status }) {
  return {
    requestId,
    donorId: donor._id,
    fullName: donor.fullName,
    bloodGroup: donor.bloodGroup,
    phone: donor.phone,
    location: donor.location,
    available: donor.available,
    distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
    status,
  };
}

// POST: Search for nearby, compatible, available, eligible donors for an emergency blood
// request. This only searches — no DonationRequest is created here, so nothing is sent to
// any donor yet. The requester reviews the matched donors and explicitly sends a request to
// whichever ones they choose, one at a time (see sendDonationRequest below).
const searchMatchingDonors = async (req, res) => {
  try {
    const validationError = validateRequestFields(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { bloodGroup, location } = req.body;
    const maxDistanceKm = Number(req.body.maxDistanceKm) || undefined;
    const { requestGeo, matches } = await findMatchingDonors({ bloodGroup, location, maxDistanceKm });

    const requestGroupId = crypto.randomUUID();
    const responseMatches = matches.map((match) =>
      formatMatch({ requestId: null, donor: match.donor, distanceKm: match.distanceKm, status: null })
    );

    res.status(200).json({
      requestGroupId,
      geocoded: !!requestGeo,
      matchedCount: responseMatches.length,
      matches: responseMatches,
    });
  } catch (error) {
    res.status(400).json({ message: 'Error searching for matching donors', error: error.message });
  }
};

// POST: Send the emergency request to one donor chosen from the search results. This is
// what actually creates the DonationRequest — it's what makes the request appear in that
// donor's "My Donor Profile" pending list (getMyRequests) so they can Accept/Reject.
// requestGroupId ties every donor sent-to from the same search back together.
const sendDonationRequest = async (req, res) => {
  try {
    const validationError = validateRequestFields(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const {
      donorId, requestGroupId, bloodGroup, component, requiredUnits, hospital, location, urgency, contact, distanceKm,
    } = req.body;
    if (!donorId || !requestGroupId) {
      return res.status(400).json({ message: 'donorId and requestGroupId are required.' });
    }

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ message: 'Donor not found.' });
    }

    const alreadySent = await DonationRequest.findOne({ donor: donorId, requestGroupId });
    if (alreadySent) {
      return res.status(409).json({ message: 'A request has already been sent to this donor for this search.' });
    }

    const request = await DonationRequest.create({
      donor: donorId,
      requestGroupId,
      requestedBy: req.user.id,
      distanceKm: distanceKm != null ? Number(distanceKm) : null,
      bloodGroup,
      component,
      requiredUnits,
      hospital,
      location,
      urgency,
      contact,
    });

    res.status(201).json(formatMatch({ requestId: request._id, donor, distanceKm: request.distanceKm, status: request.status }));
  } catch (error) {
    res.status(400).json({ message: 'Error sending donation request', error: error.message });
  }
};

// GET: Re-fetch the matched-donor list for a previously submitted emergency request, with
// optional distance/status filtering. Scoped to the user who submitted the request.
const getMatchesForGroup = async (req, res) => {
  try {
    const { requestGroupId } = req.params;
    const filter = { requestGroupId, requestedBy: req.user.id };
    if (req.query.status) filter.status = req.query.status;

    let requests = await DonationRequest.find(filter)
      .populate('donor', 'fullName bloodGroup phone location available')
      .sort({ distanceKm: 1 });

    if (req.query.maxDistanceKm) {
      const max = Number(req.query.maxDistanceKm);
      requests = requests.filter((r) => r.distanceKm == null || r.distanceKm <= max);
    }

    const matches = requests
      .filter((r) => r.donor) // donor profile may have been deleted since matching
      .map((r) => formatMatch({ requestId: r._id, donor: r.donor, distanceKm: r.distanceKm, status: r.status }));

    res.status(200).json({ requestGroupId, matchedCount: matches.length, matches });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching matched donors', error: error.message });
  }
};

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
  searchMatchingDonors,
  sendDonationRequest,
  getMatchesForGroup,
};
