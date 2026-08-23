const express = require("express");

const router = express.Router();

const {
  addMedicine,
  getMyMedicines,
  getAllMedicines,
  searchMedicine,
  updateMedicine,
  deleteMedicine,
} = require("../controllers/pharmacyMedicineController");
const requireAuth = require("../middleware/auth");
const requireRole = require("../middleware/role");

// Browsing/searching medicines is available to any signed-in user (patients need this to
// find medicines). Only verified pharmacy accounts can add, update, or delete their own
// inventory entries.
router.get("/", requireAuth, getAllMedicines);
router.get("/search", requireAuth, searchMedicine);
router.get("/me", requireAuth, requireRole("pharmacy"), getMyMedicines);
router.post("/", requireAuth, requireRole("pharmacy"), addMedicine);
router.put("/:id", requireAuth, requireRole("pharmacy"), updateMedicine);
router.delete("/:id", requireAuth, requireRole("pharmacy"), deleteMedicine);

module.exports = router;
