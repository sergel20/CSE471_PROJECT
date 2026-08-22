const mongoose = require("mongoose");

const medicineRequestSchema = new mongoose.Schema(
  {
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
      enum: ["Critical", "High", "Medium", "Low"],
      default: "Medium"
    },

    prescriptionRequired: {
      type: Boolean,
      default: false
    },

    prescription: {
      type: String,
      default: ""
    },

    requestStatus: {
      type: String,
      enum: [
        "Searching",
        "Pharmacy Responded",
        "Accepted",
        "Rejected",
        "Completed"
      ],
      default: "Searching"
    },

    matchedPharmacies: [
      {
        pharmacyName: String,
        location: String,
        availableQuantity: Number,
        price: Number,
        canFulfill: Boolean,
        responseStatus: {
          type: String,
          enum: ["Pending", "Accepted", "Rejected"],
          default: "Pending"
        },
        preparationTime: {
          type: String,
          default: ""
        }
      }
    ],

    approvedAlternatives: [
      {
        type: String
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "MedicineRequest",
  medicineRequestSchema
);