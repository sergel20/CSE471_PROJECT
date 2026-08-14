const Booking = require('../models/Booking');
const User = require('../models/User');

const ADMIN_TRANSITIONS = {
  Booked: 'Sample Collected',
  'Sample Collected': 'Received in Lab',
  'Received in Lab': 'Under Processing',
};

async function patientBookingFilter(userId) {
  const user = await User.findById(userId).select('email');
  if (!user) return null;

  // Email fallback keeps pre-migration bookings visible while all new bookings
  // are securely linked through the patient ObjectId.
  return {
    $or: [
      { patient: userId },
      { patient: { $exists: false }, 'patientInfo.email': user.email },
    ],
  };
}

const getDashboard = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'patient') {
      filter = await patientBookingFilter(req.user.id);
      if (!filter) return res.status(404).json({ message: 'User not found.' });
    } else if (req.user.role === 'lab_staff') {
      filter = {
        bookingStatus: 'Confirmed',
        'tests.sampleStatus': { $in: ['Received in Lab', 'Under Processing'] },
      };
    } else if (req.query.email) {
      filter = { 'patientInfo.email': req.query.email.trim().toLowerCase() };
    }

    const bookings = await Booking.find(filter).sort({ createdAt: -1 }).lean();

    if (req.user.role === 'lab_staff') {
      for (const booking of bookings) {
        booking.tests = booking.tests.filter((sample) =>
          ['Received in Lab', 'Under Processing'].includes(sample.sampleStatus)
        );
      }
    }

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sample dashboard', error: error.message });
  }
};

const getSampleStatus = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).lean();
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    if (req.user.role === 'patient') {
      const filter = await patientBookingFilter(req.user.id);
      if (!filter) return res.status(404).json({ message: 'Booking not found.' });
      const owned = await Booking.exists({ _id: booking._id, ...filter });
      if (!owned) return res.status(404).json({ message: 'Booking not found.' });
    }

    if (req.user.role === 'lab_staff') {
      booking.tests = booking.tests.filter((sample) =>
        ['Received in Lab', 'Under Processing'].includes(sample.sampleStatus)
      );
      if (booking.tests.length === 0) {
        return res.status(404).json({ message: 'No samples are available to the lab yet.' });
      }
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sample status', error: error.message });
  }
};

// Admin owns the pre-result steps. Result Ready and Approved are only applied
// by the result-entry and doctor-approval controllers respectively.
const updateSampleStatus = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.bookingStatus !== 'Confirmed') {
      return res.status(409).json({ message: 'Confirm the booking before updating samples.' });
    }

    const sample = booking.tests.find((item) => item.sampleId === req.params.sampleId);
    if (!sample) return res.status(404).json({ message: 'Sample not found.' });

    const expectedStatus = ADMIN_TRANSITIONS[sample.sampleStatus];
    if (!expectedStatus) {
      return res.status(409).json({
        message: `Admin cannot advance a sample from ${sample.sampleStatus}.`,
      });
    }

    const requestedStatus = req.body.status || expectedStatus;
    if (requestedStatus !== expectedStatus) {
      return res.status(400).json({
        message: `The next valid status is ${expectedStatus}.`,
      });
    }

    const admin = await User.findById(req.user.id).select('name');
    sample.sampleStatus = expectedStatus;
    sample.statusHistory.push({
      status: expectedStatus,
      updatedBy: admin?.name || 'Admin',
    });
    await booking.save();

    res.status(200).json({ message: `Sample moved to ${expectedStatus}.`, booking });
  } catch (error) {
    res.status(500).json({ message: 'Error updating sample status', error: error.message });
  }
};

module.exports = { getSampleStatus, updateSampleStatus, getDashboard };
