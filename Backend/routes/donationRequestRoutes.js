const express = require('express');
const router = express.Router();
const {
  getMyRequests,
  acceptRequest,
  rejectRequest,
  searchMatchingDonors,
  sendDonationRequest,
  getMatchesForGroup,
} = require('../controllers/donationRequestController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Searching for donors and sending an individual request are for patients and hospital
// staff — the requesting side. Responding to a request is exclusive to donors.
router.post('/', requireAuth, requireRole('patient', 'hospital_staff'), searchMatchingDonors);
router.post('/send', requireAuth, requireRole('patient', 'hospital_staff'), sendDonationRequest);
router.get('/group/:requestGroupId', requireAuth, requireRole('patient', 'hospital_staff'), getMatchesForGroup);

router.get('/me', requireAuth, requireRole('donor'), getMyRequests);
router.put('/:id/accept', requireAuth, requireRole('donor'), acceptRequest);
router.put('/:id/reject', requireAuth, requireRole('donor'), rejectRequest);

module.exports = router;
