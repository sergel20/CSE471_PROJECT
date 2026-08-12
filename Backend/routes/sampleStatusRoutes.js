const express = require('express');
const router = express.Router();
const {
  getSampleStatus,
  updateSampleStatus,
  getDashboard,
} = require('../controllers/sampleStatusController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Lab Staff/Admin get the full multi-booking dashboard (free-text email search);
// Patients hit the same endpoint but the controller scopes results to their own bookings only.
router.get('/', requireAuth, requireRole('patient', 'lab_staff', 'admin'), getDashboard);
// Same ownership scoping applies to a single booking lookup.
router.get('/:bookingId', requireAuth, getSampleStatus);
// Only Lab Staff/Admin move a sample through its status steps.
router.put('/:bookingId', requireAuth, requireRole('lab_staff', 'admin'), updateSampleStatus);

module.exports = router;