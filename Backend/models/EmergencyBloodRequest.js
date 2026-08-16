const mongoose = require("mongoose");

const emergencyBloodRequestSchema = new mongoose.Schema(
  {
    patientName: {
      type: String,
      required: true
    },

    bloodGroup: {
      type: String,
      required: true
    },

    componentType: {
      type: String,
      required: true
    },

    requiredUnits: {
      type: Number,
      required: true
    },

    hospitalName: {
      type: String,
      required: true
    },

    location: {
      type: String,
      required: true
    },

    contactNumber: {
      type: String,
      required: true
    },

    urgencyLevel: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium"
    },

    requestStatus: {
      type: String,
      enum: ["Pending", "Accepted", "Completed", "Cancelled"],
      default: "Pending"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "EmergencyBloodRequest",
  emergencyBloodRequestSchema
);