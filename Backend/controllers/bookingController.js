const Booking = require('../models/booking');

const generateSampleId = async () => {
  const count = await Booking.countDocuments();
  const serial = String(count + 1).padStart(4, '0');

  return `LAB-2026-${serial}`;
};

const createBooking = async (req, res) => {
  try {
    const booking = await Booking.create(req.body);

    res.status(201).json({
      message: 'Booking created successfully',
      booking,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create booking',
      error: error.message,
    });
  }
};

const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch bookings',
      error: error.message,
    });
  }
};

const confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: 'Booking not found',
      });
    }

    if (booking.paymentStatus !== 'Paid') {
      return res.status(400).json({
        message: 'Only paid bookings can be confirmed',
      });
    }

    if (!booking.sampleId) {
      booking.sampleId = await generateSampleId();
    }

    booking.bookingStatus = 'Confirmed';

    await booking.save();

    res.status(200).json({
      message: 'Booking confirmed and sample ID generated',
      booking,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to confirm booking',
      error: error.message,
    });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: 'Booking not found',
      });
    }

    res.status(200).json({
      message: 'Booking deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete booking',
      error: error.message,
    });
  }
};

module.exports = {
  createBooking,
  getBookings,
  confirmBooking,
  deleteBooking,
};