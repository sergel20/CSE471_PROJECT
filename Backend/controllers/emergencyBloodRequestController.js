const mongoose = require('mongoose');
const EmergencyBloodRequest = require('../models/EmergencyBloodRequest');
const { findMatchingDonors } = require('../library/donorMatching');

const { BLOOD_GROUPS, PRIORITIES, REQUEST_STATUSES } = EmergencyBloodRequest;
const MANAGER_ROLES = ['hospital_staff', 'admin'];
const REQUIRED_FIELDS = ['bloodGroup', 'componentType', 'requiredUnits', 'hospitalName', 'location', 'contactNumber', 'urgencyLevel', 'requiredBy'];
const NEXT_STATUS = {
  Submitted: 'Under Verification',
  'Under Verification': 'In Progress',
  'In Progress': 'Blood Arranged',
  'Blood Arranged': 'Completed',
};

function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && !value.trim());
}

function validationMessage(body) {
  const missing = REQUIRED_FIELDS.filter((field) => isBlank(body[field]));
  if (missing.length) return `Missing required field(s): ${missing.join(', ')}`;
  if (!BLOOD_GROUPS.includes(body.bloodGroup)) return 'Invalid blood group.';
  if (!PRIORITIES.includes(body.urgencyLevel)) return 'Urgency level must be Critical, High, or Normal.';

  const units = Number(body.requiredUnits);
  if (!Number.isInteger(units) || units < 1) return 'Required units must be a positive whole number.';

  const requiredBy = new Date(body.requiredBy);
  if (Number.isNaN(requiredBy.getTime())) return 'Required-by time must be a valid date and time.';
  if (requiredBy <= new Date()) return 'Required-by time must be in the future.';
  if (body.additionalNotes && String(body.additionalNotes).trim().length > 1000) {
    return 'Additional notes cannot exceed 1000 characters.';
  }
  return null;
}

function canAccess(request, user) {
  const ownerId = request.createdBy && request.createdBy._id ? request.createdBy._id : request.createdBy;
  return MANAGER_ROLES.includes(user.role) || ownerId.toString() === user.id;
}

function handleError(res, error, fallbackMessage) {
  if (error instanceof mongoose.Error.CastError) return res.status(404).json({ message: 'Blood request not found.' });
  if (error instanceof mongoose.Error.ValidationError) return res.status(400).json({ message: error.message });
  return res.status(500).json({ message: fallbackMessage, error: error.message });
}

// Runs geolocation-based nearby-donor matching for an emergency request and shapes the
// result for the client (see library/donorMatching.js — geocodes the request location via
// Nominatim, then $geoNear against donors' 2dsphere index). Matching is best-effort: any
// failure (geocode/network/DB) resolves to an empty list so it never blocks request
// creation or retrieval.
async function matchDonorsForRequest(request) {
  // No DB connection => matching can't run; skip straight to an empty result (also keeps
  // unit tests that stub the model from making a live geocode/aggregate call).
  if (mongoose.connection.readyState !== 1) return { geocoded: false, donors: [] };
  try {
    const { requestGeo, matches } = await findMatchingDonors({
      bloodGroup: request.bloodGroup,
      location: request.location,
    });
    return {
      geocoded: !!requestGeo,
      donors: matches.map(({ donor, distanceKm, eligibility }) => ({
        donorId: donor._id,
        fullName: donor.fullName,
        bloodGroup: donor.bloodGroup,
        phone: donor.phone,
        location: donor.location,
        available: donor.available,
        distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
        nextEligibleDate: eligibility ? eligibility.nextEligibleDate : null,
      })),
    };
  } catch (error) {
    return { geocoded: false, donors: [] };
  }
}

const createRequest = async (req, res) => {
  try {
    const errorMessage = validationMessage(req.body);
    if (errorMessage) return res.status(400).json({ message: errorMessage });

    const request = await EmergencyBloodRequest.create({
      createdBy: req.user.id,
      bloodGroup: req.body.bloodGroup,
      componentType: String(req.body.componentType).trim(),
      requiredUnits: Number(req.body.requiredUnits),
      hospitalName: String(req.body.hospitalName).trim(),
      location: String(req.body.location).trim(),
      contactNumber: String(req.body.contactNumber).trim(),
      urgencyLevel: req.body.urgencyLevel,
      requiredBy: new Date(req.body.requiredBy),
      additionalNotes: req.body.additionalNotes ? String(req.body.additionalNotes).trim() : '',
      statusHistory: [{ fromStatus: null, toStatus: 'Submitted', updatedBy: req.user.id, updatedByRole: req.user.role }],
    });
    const donorMatch = await matchDonorsForRequest(request);
    return res.status(201).json({
      message: 'Emergency blood request submitted successfully.',
      request,
      donorMatch,
    });
  } catch (error) {
    return handleError(res, error, 'Failed to create blood request.');
  }
};

// GET: Re-run nearby-donor matching for an existing request (used when the requester opens
// a request from their history). Access is limited the same way getRequestById is.
const getRequestMatches = async (req, res) => {
  try {
    const request = await EmergencyBloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Blood request not found.' });
    if (!canAccess(request, req.user)) return res.status(403).json({ message: 'You can only view your own blood requests.' });

    const donorMatch = await matchDonorsForRequest(request);
    return res.status(200).json(donorMatch);
  } catch (error) {
    return handleError(res, error, 'Failed to match donors for this request.');
  }
};

const getAllRequests = async (req, res) => {
  try {
    const filter = req.user.role === 'patient' ? { createdBy: req.user.id } : {};
    if (req.query.status && REQUEST_STATUSES.includes(req.query.status)) filter.requestStatus = req.query.status;
    if (req.query.urgency && PRIORITIES.includes(req.query.urgency)) filter.urgencyLevel = req.query.urgency;
    const requests = await EmergencyBloodRequest.find(filter).populate('createdBy', 'name email role').sort({ createdAt: -1 });
    return res.status(200).json(requests);
  } catch (error) {
    return handleError(res, error, 'Failed to fetch blood requests.');
  }
};

const getRequestHistory = async (req, res) => {
  try {
    const filter = req.user.role === 'patient' ? { createdBy: req.user.id } : {};
    const requests = await EmergencyBloodRequest.find(filter)
      .select('createdBy bloodGroup componentType requiredUnits hospitalName urgencyLevel requiredBy requestStatus latestProgressNote progressUpdates createdAt updatedAt')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });
    return res.status(200).json(requests);
  } catch (error) {
    return handleError(res, error, 'Failed to fetch request history.');
  }
};

const getRequestById = async (req, res) => {
  try {
    const request = await EmergencyBloodRequest.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('progressUpdates.updatedBy', 'name role')
      .populate('statusHistory.updatedBy', 'name role');
    if (!request) return res.status(404).json({ message: 'Blood request not found.' });
    if (!canAccess(request, req.user)) return res.status(403).json({ message: 'You can only view your own blood requests.' });
    return res.status(200).json(request);
  } catch (error) {
    return handleError(res, error, 'Failed to fetch blood request.');
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!REQUEST_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid request status.' });
    const request = await EmergencyBloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Blood request not found.' });

    if (req.user.role === 'patient') {
      if (request.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'You can only cancel your own blood request.' });
      if (request.requestStatus !== 'Submitted' || status !== 'Cancelled') {
        return res.status(409).json({ message: 'A patient can only cancel their own request while it is Submitted.' });
      }
    } else if (MANAGER_ROLES.includes(req.user.role)) {
      const expectedStatus = NEXT_STATUS[request.requestStatus];
      if (status !== expectedStatus) {
        return res.status(409).json({
          message: expectedStatus ? `The next allowed status is ${expectedStatus}.` : `A ${request.requestStatus} request cannot be changed.`,
        });
      }
    } else {
      return res.status(403).json({ message: 'You do not have permission to update request status.' });
    }

    const previousStatus = request.requestStatus;
    request.requestStatus = status;
    request.statusHistory.push({ fromStatus: previousStatus, toStatus: status, updatedBy: req.user.id, updatedByRole: req.user.role });
    await request.save();
    return res.status(200).json({ message: `Request status updated to ${status}.`, request });
  } catch (error) {
    return handleError(res, error, 'Failed to update request status.');
  }
};

const updateProgressNote = async (req, res) => {
  try {
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
    if (!note) return res.status(400).json({ message: 'Progress note is required.' });
    if (note.length > 500) return res.status(400).json({ message: 'Progress note cannot exceed 500 characters.' });
    const request = await EmergencyBloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Blood request not found.' });
    if (['Completed', 'Cancelled'].includes(request.requestStatus)) {
      return res.status(409).json({ message: `Progress cannot be updated after a request is ${request.requestStatus}.` });
    }
    request.latestProgressNote = note;
    request.progressUpdates.push({ note, status: request.requestStatus, updatedBy: req.user.id, updatedByRole: req.user.role });
    await request.save();
    return res.status(200).json({ message: 'Progress note updated successfully.', request });
  } catch (error) {
    return handleError(res, error, 'Failed to update progress note.');
  }
};

module.exports = { createRequest, getAllRequests, getRequestById, getRequestMatches, updateStatus, updateProgressNote, getRequestHistory };
