const express = require('express');
const router = express.Router();
const {
  getSampleStatus,
  updateSampleStatus,
  getDashboard,
} = require('../controllers/sampleStatusController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Patients see their own tracking data; lab staff only receive samples released
// by the admin at Received in Lab or Under Processing.
router.get('/', requireAuth, requireRole('patient', 'lab_staff', 'admin'), getDashboard);
router.get('/:bookingId', requireAuth, requireRole('patient', 'lab_staff', 'admin'), getSampleStatus);
// Admin controls Booked -> Sample Collected -> Received in Lab -> Under Processing.
router.put('/:bookingId/:sampleId', requireAuth, requireRole('admin'), updateSampleStatus);

module.exports = router;
