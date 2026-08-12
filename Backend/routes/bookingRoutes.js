const express = require('express');
const router = express.Router();
const { previewBooking } = require('../controllers/bookingController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

// POST: Validate selected tests + patient info, return server-calculated total (no DB write)
router.post('/preview', requireAuth, requireRole('patient'), previewBooking);

module.exports = router;
