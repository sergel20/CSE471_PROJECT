const express = require('express');
const router = express.Router();
const {
  previewBooking,
  createBookingRequest,
  getAdminBookings,
  confirmBooking,
} = require('../controllers/bookingController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Patients preview the server-calculated price, then submit a confirmation request.
router.post('/preview', requireAuth, requireRole('patient'), previewBooking);
router.post('/', requireAuth, requireRole('patient'), createBookingRequest);

// The admin confirms the simulated payment and generates one sample ID per test.
router.get('/admin', requireAuth, requireRole('admin'), getAdminBookings);
router.put('/:bookingId/confirm', requireAuth, requireRole('admin'), confirmBooking);

module.exports = router;
