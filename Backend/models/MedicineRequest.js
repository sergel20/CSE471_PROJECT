const mongoose = require("mongoose");

// A patient's urgent request for a medicine, routed to whichever pharmacy responds first.
// Deliberately request/response only — no multi-pharmacy matching or availability search
// here, since that's owned by Medicine Search and Availability (pharmacyMedicineController)
// and Pharmacy Stock and Expiry Management (also pharmacyMedicineController/PharmacyMedicine).
const medicineRequestSchema = new mongoose.Schema(
  {
    // The patient account that submitted this request. Set from the authenticated user on
    // create (see medicineRequestController.createMedicineRequest), never accepted from the
    // request body, so requests can be scoped to "my requests" (getMyRequests).
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    patientName: {
      type: String,
      required: true,
      trim: true
    },

    medicineName: {
      type: String,
      required: true,
      trim: true
    },

    requestedQuantity: {
      type: Number,
      required: true,
      min: 1
    },

    location: {
      type: String,
      required: true,
      trim: true
    },

    urgencyLevel: {
      type: String,
      enum: ["Low", "Medium", "High", "Emergency"],
      default: "Medium"
    },

    prescriptionRequired: {
      type: Boolean,
      default: false
    },

    // Optional free-text prescription details (e.g. dosage, prescribing doctor).
    prescription: {
      type: String,
      default: ""
    },

    requestStatus: {
      type: String,
      enum: ["Pending", "Accepted", "Ready for Pickup", "Completed", "Rejected"],
      default: "Pending"
    },

    // Filled in by whichever pharmacy responds — see acceptRequest/rejectRequest and the
    // preparation-time/response-message updates in medicineRequestController.
    pharmacyResponse: {
      pharmacy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      pharmacyName: {
        type: String,
        default: ""
      },
      preparationTime: {
        type: String,
        default: ""
      },
      responseMessage: {
        type: String,
        default: ""
      },
      respondedAt: {
        type: Date,
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("MedicineRequest", medicineRequestSchema);
