const express = require("express");

const router = express.Router();

const {
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
} = require("../controllers/medicineRequestController");
const requireAuth = require("../middleware/auth");
const requireRole = require("../middleware/role");

// Patients submit urgent medicine requests and track their own; pharmacies browse the open
// queue and respond to the ones they pick up. There's no per-pharmacy targeting or matching
// here — that's owned by Medicine Search and Availability — so a request stays visible to
// every pharmacy until one of them accepts or rejects it.
router.post("/", requireAuth, requireRole("patient"), createMedicineRequest);
router.get("/me", requireAuth, requireRole("patient"), getMyRequests);

router.get("/", requireAuth, requireRole("pharmacy"), getPendingRequests);
router.get("/assigned", requireAuth, requireRole("pharmacy"), getAssignedRequests);

router.get("/:id", requireAuth, requireRole("patient", "pharmacy"), getRequestById);

router.put("/:id/accept", requireAuth, requireRole("pharmacy"), acceptRequest);
router.put("/:id/reject", requireAuth, requireRole("pharmacy"), rejectRequest);
router.put("/:id/preparation-time", requireAuth, requireRole("pharmacy"), updatePreparationTime);
router.put("/:id/response-message", requireAuth, requireRole("pharmacy"), updateResponseMessage);
router.put("/:id/ready", requireAuth, requireRole("pharmacy"), markReadyForPickup);
router.put("/:id/complete", requireAuth, requireRole("pharmacy"), completeRequest);

module.exports = router;
