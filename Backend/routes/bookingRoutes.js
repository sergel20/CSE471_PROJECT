const express = require('express');
const router = express.Router();
const { previewBooking } = require('../controllers/bookingController');

// POST: Validate selected tests + patient info, return server-calculated total (no DB write)
router.post('/preview', previewBooking);

module.exports = router;
