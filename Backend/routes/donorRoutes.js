const express = require('express');
const router = express.Router();
const {
  getMyDonor,
  upsertMyDonor,
  deleteMyDonor,
  getMyDonationHistory,
} = require('../controllers/donorController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Donor profile management is exclusive to the Blood Donor role.
router.get('/me', requireAuth, requireRole('donor'), getMyDonor);
router.put('/me', requireAuth, requireRole('donor'), upsertMyDonor);
router.delete('/me', requireAuth, requireRole('donor'), deleteMyDonor);
router.get('/me/donations', requireAuth, requireRole('donor'), getMyDonationHistory);

module.exports = router;
