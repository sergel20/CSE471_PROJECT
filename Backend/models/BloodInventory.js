const mongoose = require('mongoose');

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENT_TYPES = ['Whole Blood', 'Plasma', 'Platelets', 'Red Blood Cells', 'Cryoprecipitate'];

const BloodInventorySchema = new mongoose.Schema({
  bloodGroup: {
    type: String,
    required: true,
    enum: BLOOD_GROUPS,
  },
  componentType: {
    type: String,
    required: true,
    enum: COMPONENT_TYPES,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0, // units
  },
  collectionDate: {
    type: Date,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return value > this.collectionDate;
      },
      message: 'Expiry date must be after the collection date.',
    },
  },
  hospital: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Available', 'Reserved', 'Used', 'Expired', 'Discarded'],
    default: 'Available',
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

BloodInventorySchema.methods.getDaysUntilExpiry = function () {
  const ms = new Date(this.expiryDate).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model('BloodInventory', BloodInventorySchema);
module.exports.BLOOD_GROUPS = BLOOD_GROUPS;
module.exports.COMPONENT_TYPES = COMPONENT_TYPES;