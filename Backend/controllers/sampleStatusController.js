const Booking = require('../models/Booking');

const VALID_STATUSES = [
  'Booked',
  'Sample Collected',
  'Received in Lab',
  'Under Processing',
  'Result Ready',
  'Approved',
  'Delivered',
];

// GET /api/sample-status/:bookingId
// Patient checks current status of one booking
const getSampleStatus = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).select(
      'sampleStatus statusHistory tests preferredDate'
    );
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sample status', error: error.message });
  }
};

// PUT /api/sample-status/:bookingId
// Lab staff updates the status step by step
const updateSampleStatus = async (req, res) => {
  try {
    const { status, updatedBy } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.sampleStatus = status;
    booking.statusHistory.push({ status, updatedBy: updatedBy || 'Lab Staff' });
    await booking.save();

    res.status(200).json({ message: 'Sample status updated', booking });
  } catch (error) {
    res.status(400).json({ message: 'Error updating sample status', error: error.message });
  }
};

// GET /api/sample-status
// Dashboard - all bookings with their current status (filter by ?email=)
const getDashboard = async (req, res) => {
  try {
    const filter = {};
    if (req.query.email) {
      filter['patientInfo.email'] = req.query.email;
    }
    const bookings = await Booking.find(filter).sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard', error: error.message });
  }
};

module.exports = { getSampleStatus, updateSampleStatus, getDashboard };