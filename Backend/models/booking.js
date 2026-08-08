const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    testName: {
      type: String,
      required: true,
      trim: true,
    },
    bookingDate: {
      type: String,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    bookingStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Cancelled'],
      default: 'Pending',
    },
    sampleId: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;