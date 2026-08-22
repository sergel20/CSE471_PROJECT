const PharmacyMedicine = require("../models/PharmacyMedicine");


// Add medicine to pharmacy inventory
exports.addMedicine = async (req, res) => {
  try {
    const {
      medicineName,
      pharmacyName,
      location,
      availableQuantity,
      price,
      prescriptionRequired,
      alternativeMedicines
    } = req.body;

    if (
      !medicineName ||
      !pharmacyName ||
      !location ||
      availableQuantity === undefined ||
      price === undefined
    ) {
      return res.status(400).json({
        message: "Please provide all required fields."
      });
    }

    const medicine = await PharmacyMedicine.create({
      medicineName,
      pharmacyName,
      location,
      availableQuantity,
      price,
      prescriptionRequired,
      alternativeMedicines
    });

    res.status(201).json({
      message: "Medicine added to pharmacy inventory successfully.",
      medicine
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to add medicine.",
      error: error.message
    });
  }
};


// Get all pharmacy medicines
exports.getAllMedicines = async (req, res) => {
  try {
    const medicines = await PharmacyMedicine.find()
      .sort({ medicineName: 1 });

    res.status(200).json({
      count: medicines.length,
      medicines
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch medicines.",
      error: error.message
    });
  }
};


// Search medicine
exports.searchMedicine = async (req, res) => {
  try {
    const { medicineName, location } = req.query;

    const filter = {};

    if (medicineName) {
      filter.medicineName = {
        $regex: medicineName,
        $options: "i"
      };
    }

    if (location) {
      filter.location = {
        $regex: location,
        $options: "i"
      };
    }

    const medicines = await PharmacyMedicine.find(filter)
      .sort({ availableQuantity: -1 });

    res.status(200).json({
      count: medicines.length,
      medicines
    });

  } catch (error) {
    res.status(500).json({
      message: "Medicine search failed.",
      error: error.message
    });
  }
};


// Update pharmacy stock
exports.updateStock = async (req, res) => {
  try {
    const medicine = await PharmacyMedicine.findById(
      req.params.id
    );

    if (!medicine) {
      return res.status(404).json({
        message: "Medicine not found."
      });
    }

    medicine.availableQuantity =
      req.body.availableQuantity;

    await medicine.save();

    res.status(200).json({
      message: "Medicine stock updated successfully.",
      medicine
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to update stock.",
      error: error.message
    });
  }
};