const MedicineRequest = require("../models/MedicineRequest");
const User = require("../models/User");

const REQUIRED_FIELDS = ["patientName", "medicineName", "requestedQuantity", "location"];
const URGENCY_LEVELS = ["Low", "Medium", "High", "Emergency"];
// Lower weight = more urgent. Used to sort the pending queue (see getPendingRequests) since
// urgencyLevel is a string enum and can't be sorted correctly by MongoDB alone.
const URGENCY_WEIGHT = { Emergency: 0, High: 1, Medium: 2, Low: 3 };

// Looks up the request and, if an atomic status/ownership-scoped update failed, figures out
// why (not found / assigned to a different pharmacy / wrong status for this action) so the
// caller can return the right error. Mirrors donationRequestController.diagnoseFailedResponse.
async function diagnoseFailedUpdate(requestId, pharmacyId) {
  const existing = await MedicineRequest.findById(requestId);
  if (!existing) {
    return { status: 404, message: "Medicine request not found." };
  }
  if (
    pharmacyId &&
    existing.pharmacyResponse.pharmacy &&
    existing.pharmacyResponse.pharmacy.toString() !== pharmacyId.toString()
  ) {
    return { status: 403, message: "This request is being handled by a different pharmacy." };
  }
  return {
    status: 409,
    message: `This request is currently "${existing.requestStatus}" and cannot be updated that way.`,
  };
}

// POST: A patient submits an urgent medicine request. Starts unassigned and Pending — any
// pharmacy can pick it up (see acceptRequest/rejectRequest below).
const createMedicineRequest = async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((field) => req.body[field] === undefined || req.body[field] === "");
    if (missing.length > 0) {
      return res.status(400).json({ message: `Missing required field(s): ${missing.join(", ")}` });
    }
    if (req.body.urgencyLevel && !URGENCY_LEVELS.includes(req.body.urgencyLevel)) {
      return res.status(400).json({ message: `urgencyLevel must be one of: ${URGENCY_LEVELS.join(", ")}` });
    }

    const request = await MedicineRequest.create({
      patient: req.user.id,
      patientName: req.body.patientName,
      medicineName: req.body.medicineName,
      requestedQuantity: req.body.requestedQuantity,
      location: req.body.location,
      urgencyLevel: req.body.urgencyLevel || "Medium",
      prescriptionRequired: !!req.body.prescriptionRequired,
      prescription: req.body.prescription || "",
    });

    res.status(201).json({ message: "Medicine request submitted successfully.", request });
  } catch (error) {
    res.status(400).json({ message: "Failed to submit medicine request.", error: error.message });
  }
};

// GET: A patient's own submitted requests, most recent first.
const getMyRequests = async (req, res) => {
  try {
    const requests = await MedicineRequest.find({ patient: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your medicine requests.", error: error.message });
  }
};

// GET: A single request. Visible to the patient who submitted it, or to a pharmacy that's
// either handling it already or could still pick it up (still Pending).
const getRequestById = async (req, res) => {
  try {
    const request = await MedicineRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Medicine request not found." });
    }

    const isOwningPatient = req.user.role === "patient" && request.patient.toString() === req.user.id;
    const isOpenOrOwningPharmacy =
      req.user.role === "pharmacy" &&
      (request.requestStatus === "Pending" ||
        (request.pharmacyResponse.pharmacy && request.pharmacyResponse.pharmacy.toString() === req.user.id));

    if (!isOwningPatient && !isOpenOrOwningPharmacy) {
      return res.status(403).json({ message: "You do not have permission to view this request." });
    }

    res.status(200).json({ request });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch medicine request.", error: error.message });
  }
};

// GET: The open queue of requests any pharmacy can respond to, most urgent first.
const getPendingRequests = async (req, res) => {
  try {
    const requests = await MedicineRequest.find({ requestStatus: "Pending" }).sort({ createdAt: 1 });
    requests.sort((a, b) => URGENCY_WEIGHT[a.urgencyLevel] - URGENCY_WEIGHT[b.urgencyLevel]);
    res.status(200).json({ count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pending medicine requests.", error: error.message });
  }
};

// GET: Requests the logged-in pharmacy is currently handling, or has completed/rejected.
const getAssignedRequests = async (req, res) => {
  try {
    const requests = await MedicineRequest.find({ "pharmacyResponse.pharmacy": req.user.id }).sort({
      updatedAt: -1,
    });
    res.status(200).json({ count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your assigned medicine requests.", error: error.message });
  }
};

// PUT: Claim a Pending request. The status flip is atomic (only succeeds if the request is
// currently Pending), which is what stops two pharmacies from both accepting it at once.
const acceptRequest = async (req, res) => {
  try {
    const pharmacyUser = await User.findById(req.user.id);
    if (!pharmacyUser) {
      return res.status(404).json({ message: "Pharmacy account not found." });
    }

    const request = await MedicineRequest.findOneAndUpdate(
      { _id: req.params.id, requestStatus: "Pending" },
      {
        requestStatus: "Accepted",
        "pharmacyResponse.pharmacy": pharmacyUser._id,
        "pharmacyResponse.pharmacyName": pharmacyUser.name,
        "pharmacyResponse.respondedAt": new Date(),
      },
      { new: true }
    );

    if (!request) {
      const failure = await diagnoseFailedUpdate(req.params.id, null);
      return res.status(failure.status).json({ message: failure.message });
    }

    res.status(200).json({ message: "Medicine request accepted.", request });
  } catch (error) {
    res.status(400).json({ message: "Failed to accept medicine request.", error: error.message });
  }
};

// PUT: Reject a Pending request outright. Closes it for every pharmacy — it is not re-queued
// for anyone else, matching the Pending -> Rejected terminal path in the status flow.
const rejectRequest = async (req, res) => {
  try {
    const request = await MedicineRequest.findOneAndUpdate(
      { _id: req.params.id, requestStatus: "Pending" },
      {
        requestStatus: "Rejected",
        "pharmacyResponse.responseMessage": req.body.responseMessage || "",
        "pharmacyResponse.respondedAt": new Date(),
      },
      { new: true }
    );

    if (!request) {
      const failure = await diagnoseFailedUpdate(req.params.id, null);
      return res.status(failure.status).json({ message: failure.message });
    }

    res.status(200).json({ message: "Medicine request rejected.", request });
  } catch (error) {
    res.status(400).json({ message: "Failed to reject medicine request.", error: error.message });
  }
};

// PUT: Update the preparation time estimate on a request this pharmacy has accepted.
const updatePreparationTime = async (req, res) => {
  try {
    const { preparationTime } = req.body;
    if (!preparationTime) {
      return res.status(400).json({ message: "preparationTime is required." });
    }

    const request = await MedicineRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        "pharmacyResponse.pharmacy": req.user.id,
        requestStatus: { $in: ["Accepted", "Ready for Pickup"] },
      },
      { "pharmacyResponse.preparationTime": preparationTime },
      { new: true }
    );

    if (!request) {
      const failure = await diagnoseFailedUpdate(req.params.id, req.user.id);
      return res.status(failure.status).json({ message: failure.message });
    }

    res.status(200).json({ message: "Preparation time updated.", request });
  } catch (error) {
    res.status(400).json({ message: "Failed to update preparation time.", error: error.message });
  }
};

// PUT: Add or update a free-text message to the patient about this request (e.g. "3 units
// available, 1 on backorder").
const updateResponseMessage = async (req, res) => {
  try {
    const { responseMessage } = req.body;
    if (!responseMessage) {
      return res.status(400).json({ message: "responseMessage is required." });
    }

    const request = await MedicineRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        "pharmacyResponse.pharmacy": req.user.id,
        requestStatus: { $in: ["Accepted", "Ready for Pickup"] },
      },
      { "pharmacyResponse.responseMessage": responseMessage },
      { new: true }
    );

    if (!request) {
      const failure = await diagnoseFailedUpdate(req.params.id, req.user.id);
      return res.status(failure.status).json({ message: failure.message });
    }

    res.status(200).json({ message: "Response message updated.", request });
  } catch (error) {
    res.status(400).json({ message: "Failed to update response message.", error: error.message });
  }
};

// PUT: Accepted -> Ready for Pickup, once the pharmacy has the medicine prepared.
const markReadyForPickup = async (req, res) => {
  try {
    const request = await MedicineRequest.findOneAndUpdate(
      { _id: req.params.id, "pharmacyResponse.pharmacy": req.user.id, requestStatus: "Accepted" },
      { requestStatus: "Ready for Pickup" },
      { new: true }
    );

    if (!request) {
      const failure = await diagnoseFailedUpdate(req.params.id, req.user.id);
      return res.status(failure.status).json({ message: failure.message });
    }

    res.status(200).json({ message: "Request marked ready for pickup.", request });
  } catch (error) {
    res.status(400).json({ message: "Failed to update medicine request.", error: error.message });
  }
};

// PUT: Ready for Pickup -> Completed, once the patient has collected the medicine.
const completeRequest = async (req, res) => {
  try {
    const request = await MedicineRequest.findOneAndUpdate(
      { _id: req.params.id, "pharmacyResponse.pharmacy": req.user.id, requestStatus: "Ready for Pickup" },
      { requestStatus: "Completed" },
      { new: true }
    );

    if (!request) {
      const failure = await diagnoseFailedUpdate(req.params.id, req.user.id);
      return res.status(failure.status).json({ message: failure.message });
    }

    res.status(200).json({ message: "Medicine request completed.", request });
  } catch (error) {
    res.status(400).json({ message: "Failed to complete medicine request.", error: error.message });
  }
};

module.exports = {
  createMedicineRequest,
  getMyRequests,
  getRequestById,
  getPendingRequests,
  getAssignedRequests,
  acceptRequest,
  rejectRequest,
  updatePreparationTime,
  updateResponseMessage,
  markReadyForPickup,
  completeRequest,
};
