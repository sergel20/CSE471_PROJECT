const express = require('express');
const router = express.Router();
const { getMyRequests, acceptRequest, rejectRequest } = require('../controllers/donationRequestController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Responding to donation requests is exclusive to the Blood Donor role.
router.get('/me', requireAuth, requireRole('donor'), getMyRequests);
router.put('/:id/accept', requireAuth, requireRole('donor'), acceptRequest);
router.put('/:id/reject', requireAuth, requireRole('donor'), rejectRequest);

module.exports = router;
