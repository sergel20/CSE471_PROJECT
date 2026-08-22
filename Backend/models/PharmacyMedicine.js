const mongoose = require("mongoose");

const pharmacyMedicineSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      required: true,
      trim: true
    },

    pharmacyName: {
      type: String,
      required: true,
      trim: true
    },

    location: {
      type: String,
      required: true,
      trim: true
    },

    availableQuantity: {
      type: Number,
      required: true,
      min: 0
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    prescriptionRequired: {
      type: Boolean,
      default: false
    },

    alternativeMedicines: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "PharmacyMedicine",
  pharmacyMedicineSchema
);