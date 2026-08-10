const express = require('express');
const router = express.Router();
const {
  getMyDonor,
  upsertMyDonor,
  deleteMyDonor,
  getMyDonationHistory,
} = require('../controllers/donorController');
const requireAuth = require('../middleware/auth');

router.get('/me', requireAuth, getMyDonor);
router.put('/me', requireAuth, upsertMyDonor);
router.delete('/me', requireAuth, deleteMyDonor);
router.get('/me/donations', requireAuth, getMyDonationHistory);

module.exports = router;
