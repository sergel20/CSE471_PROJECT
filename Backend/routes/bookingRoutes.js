const express = require('express');

const {
  createBooking,
  getBookings,
  confirmBooking,
  deleteBooking,
} = require('../controllers/bookingController');

const router = express.Router();

router.post('/', createBooking);
router.get('/', getBookings);
router.put('/confirm/:id', confirmBooking);
router.delete('/:id', deleteBooking);

module.exports = router;