const mongoose = require("mongoose");

// Thresholds behind the derived stock status shown to users (see computeStockStatus).
const LOW_STOCK_THRESHOLD = 10; // units at/below this count as "Low Stock" (and > 0)
const EXPIRING_SOON_DAYS = 30; // days out from today that count as "Expiring Soon"

const pharmacyMedicineSchema = new mongoose.Schema(
  {
    // The verified pharmacy account that owns this inventory entry. Set from the
    // authenticated user on create (see pharmacyMedicineController.addMedicine) — never
    // accepted from the request body, so one pharmacy can't write into another's stock.
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    medicineName: {
      type: String,
      required: true,
      trim: true
    },

    brand: {
      type: String,
      required: true,
      trim: true
    },

    // Optional grouping used by medicine search (e.g. "Painkiller", "Antibiotic").
    // Not required so existing inventory entries created before this field was added
    // remain valid.
    category: {
      type: String,
      trim: true,
      default: ""
    },

    // Denormalized from the owning pharmacy's account name at creation time, so other
    // features (medicine search, emergency medicine matching) can display/filter on it
    // without an extra lookup — mirrors `pharmacyResponse.pharmacyName` on MedicineRequest.
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

    batchNumber: {
      type: String,
      required: true,
      trim: true
    },

    expiryDate: {
      type: Date,
      required: true
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

// Derives the display status for a medicine entry from its quantity and expiry date.
// Deliberately computed on read (never stored) so it's always accurate against "now".
// Exported as a plain function so it also works against lean()/aggregate() results, not
// just hydrated documents — same reasoning as Donor.computeEligibility.
function computeStockStatus(medicine) {
  const now = new Date();
  const expiryDate = medicine.expiryDate ? new Date(medicine.expiryDate) : null;

  if (expiryDate && expiryDate < now) return "Expired";
  if (medicine.availableQuantity <= 0) return "Out of Stock";

  if (expiryDate) {
    const daysToExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysToExpiry <= EXPIRING_SOON_DAYS) return "Expiring Soon";
  }

  if (medicine.availableQuantity <= LOW_STOCK_THRESHOLD) return "Low Stock";
  return "In Stock";
}

pharmacyMedicineSchema.methods.getStockStatus = function () {
  return computeStockStatus(this);
};

module.exports = mongoose.model("PharmacyMedicine", pharmacyMedicineSchema);
module.exports.computeStockStatus = computeStockStatus;
module.exports.LOW_STOCK_THRESHOLD = LOW_STOCK_THRESHOLD;
module.exports.EXPIRING_SOON_DAYS = EXPIRING_SOON_DAYS;
