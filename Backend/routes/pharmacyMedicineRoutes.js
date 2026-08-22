const express = require("express");

const router = express.Router();

const {
  addMedicine,
  getAllMedicines,
  searchMedicine,
  updateStock
} = require("../controllers/pharmacyMedicineController");

router.post("/", addMedicine);

router.get("/", getAllMedicines);

router.get("/search", searchMedicine);

router.put("/:id/stock", updateStock);

module.exports = router;