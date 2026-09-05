const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  bloodUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodInventory',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
}, { _id: true, timestamps: true });

const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: {
    type: [CartItemSchema],
    default: [],
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Cart', CartSchema);