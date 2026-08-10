const express = require('express');
const router = express.Router();
const { getMyRequests, acceptRequest, rejectRequest } = require('../controllers/donationRequestController');
const requireAuth = require('../middleware/auth');

router.get('/me', requireAuth, getMyRequests);
router.put('/:id/accept', requireAuth, acceptRequest);
router.put('/:id/reject', requireAuth, rejectRequest);

module.exports = router;
