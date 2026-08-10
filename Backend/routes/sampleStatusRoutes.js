const express = require('express');
const router = express.Router();
const {
  getSampleStatus,
  updateSampleStatus,
  getDashboard,
} = require('../controllers/sampleStatusController');

router.get('/', getDashboard);
router.get('/:bookingId', getSampleStatus);
router.put('/:bookingId', updateSampleStatus);

module.exports = router;