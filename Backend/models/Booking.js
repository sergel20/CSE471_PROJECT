const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  tests: [
    {
      test: { type: mongoose.Schema.Types.ObjectId, ref: 'DiagnosticTest', required: true },
      testName: { type: String, required: true },
      price: { type: Number, required: true },
    },
  ],
  patientInfo: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
  },
  preferredDate: { type: Date, required: true },
  totalPrice: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Booking', BookingSchema);
