const express = require("express");

const router = express.Router();

const {
  createMedicineRequest,
  getAllMedicineRequests,
  getMedicineRequestById,
  pharmacyResponse,
  completeRequest
} = require("../controllers/medicineRequestController");

router.post("/", createMedicineRequest);

router.get("/", getAllMedicineRequests);

router.get("/:id", getMedicineRequestById);

router.put("/:id/pharmacy-response", pharmacyResponse);

router.put("/:id/complete", completeRequest);

module.exports = router;