const express = require('express');
const router = express.Router();
const {
  getMyRequests,
  acceptRequest,
  rejectRequest,
  createEmergencyRequest,
  getMatchesForGroup,
} = require('../controllers/donationRequestController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Submitting an emergency request (and viewing its matched donors) is for patients and
// hospital staff — the requesting side. Responding to a request is exclusive to donors.
router.post('/', requireAuth, requireRole('patient', 'hospital_staff'), createEmergencyRequest);
router.get('/group/:requestGroupId', requireAuth, requireRole('patient', 'hospital_staff'), getMatchesForGroup);

router.get('/me', requireAuth, requireRole('donor'), getMyRequests);
router.put('/:id/accept', requireAuth, requireRole('donor'), acceptRequest);
router.put('/:id/reject', requireAuth, requireRole('donor'), rejectRequest);

module.exports = router;
