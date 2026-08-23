const PharmacyMedicine = require("../models/PharmacyMedicine");
const User = require("../models/User");

// Fields a pharmacy is allowed to set when adding a medicine, or touch on update.
// `pharmacy` and `pharmacyName` are deliberately excluded — they're tied to the
// authenticated account (see addMedicine) and never accepted from the request body,
// so one pharmacy can't create or edit entries under another pharmacy's name.
const EDITABLE_FIELDS = [
  "medicineName",
  "brand",
  "location",
  "batchNumber",
  "expiryDate",
  "availableQuantity",
  "price",
  "prescriptionRequired",
  "alternativeMedicines",
];

function pickEditableFields(source) {
  const picked = {};
  for (const field of EDITABLE_FIELDS) {
    if (source[field] !== undefined) picked[field] = source[field];
  }
  return picked;
}

// Attaches the calculated stock status to a medicine document before sending it to the client.
function withStockStatus(medicine) {
  const obj = medicine.toObject();
  obj.stockStatus = medicine.getStockStatus();
  return obj;
}

// Looks up the medicine and, if an ownership-scoped query failed, figures out why (not
// found vs. belongs to a different pharmacy) so the caller can return the right error.
async function diagnoseMissingMedicine(id, pharmacyId) {
  const existing = await PharmacyMedicine.findById(id);
  if (!existing) {
    return { status: 404, message: "Medicine not found." };
  }
  if (existing.pharmacy.toString() !== pharmacyId.toString()) {
    return { status: 403, message: "This medicine belongs to a different pharmacy." };
  }
  return { status: 404, message: "Medicine not found." };
}

// POST: Add a medicine to the logged-in pharmacy's inventory.
const addMedicine = async (req, res) => {
  try {
    const fields = pickEditableFields(req.body);
    const missing = ["medicineName", "brand", "location", "batchNumber", "expiryDate", "availableQuantity", "price"]
      .filter((field) => fields[field] === undefined || fields[field] === "");
    if (missing.length > 0) {
      return res.status(400).json({ message: `Missing required field(s): ${missing.join(", ")}` });
    }

    const pharmacyUser = await User.findById(req.user.id);
    if (!pharmacyUser) {
      return res.status(404).json({ message: "Pharmacy account not found." });
    }

    const medicine = await PharmacyMedicine.create({
      ...fields,
      pharmacy: pharmacyUser._id,
      pharmacyName: pharmacyUser.name,
    });

    res.status(201).json({
      message: "Medicine added to pharmacy inventory successfully.",
      medicine: withStockStatus(medicine),
    });
  } catch (error) {
    res.status(400).json({ message: "Failed to add medicine.", error: error.message });
  }
};

// GET: List every medicine belonging to the logged-in pharmacy — their own inventory view.
const getMyMedicines = async (req, res) => {
  try {
    const medicines = await PharmacyMedicine.find({ pharmacy: req.user.id }).sort({ medicineName: 1 });
    res.status(200).json({ count: medicines.length, medicines: medicines.map(withStockStatus) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your medicines.", error: error.message });
  }
};

// GET: List every pharmacy's medicines — used by medicine search/availability (member4)
// and emergency medicine matching (member1). Open to any authenticated role.
const getAllMedicines = async (req, res) => {
  try {
    const medicines = await PharmacyMedicine.find().sort({ medicineName: 1 });
    res.status(200).json({ count: medicines.length, medicines: medicines.map(withStockStatus) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch medicines.", error: error.message });
  }
};

// GET: Search medicines by name and/or location.
const searchMedicine = async (req, res) => {
  try {
    const { medicineName, location } = req.query;
    const filter = {};

    if (medicineName) {
      filter.medicineName = { $regex: medicineName, $options: "i" };
    }
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    const medicines = await PharmacyMedicine.find(filter).sort({ availableQuantity: -1 });
    res.status(200).json({ count: medicines.length, medicines: medicines.map(withStockStatus) });
  } catch (error) {
    res.status(500).json({ message: "Medicine search failed.", error: error.message });
  }
};

// PUT: Update a medicine entry owned by the logged-in pharmacy (details and/or stock).
const updateMedicine = async (req, res) => {
  try {
    const updates = pickEditableFields(req.body);
    const medicine = await PharmacyMedicine.findOne({ _id: req.params.id, pharmacy: req.user.id });

    if (!medicine) {
      const failure = await diagnoseMissingMedicine(req.params.id, req.user.id);
      return res.status(failure.status).json({ message: failure.message });
    }

    Object.assign(medicine, updates);
    await medicine.save();

    res.status(200).json({
      message: "Medicine updated successfully.",
      medicine: withStockStatus(medicine),
    });
  } catch (error) {
    res.status(400).json({ message: "Failed to update medicine.", error: error.message });
  }
};

// DELETE: Remove a medicine entry owned by the logged-in pharmacy.
const deleteMedicine = async (req, res) => {
  try {
    const deleted = await PharmacyMedicine.findOneAndDelete({ _id: req.params.id, pharmacy: req.user.id });
    if (!deleted) {
      const failure = await diagnoseMissingMedicine(req.params.id, req.user.id);
      return res.status(failure.status).json({ message: failure.message });
    }
    res.status(200).json({ message: "Medicine removed from inventory successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete medicine.", error: error.message });
  }
};

module.exports = {
  addMedicine,
  getMyMedicines,
  getAllMedicines,
  searchMedicine,
  updateMedicine,
  deleteMedicine,
};
