const express = require('express');
const router = express.Router();
const {
  reviewReport,
  viewApprovedReport,
  getPendingReports,
} = require('../controllers/reportApprovalController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Doctor's approval queue and decision are Doctor/Admin only.
router.get('/pending', requireAuth, requireRole('doctor', 'admin'), getPendingReports);
router.put('/:resultId', requireAuth, requireRole('doctor', 'admin'), reviewReport);
// Any signed-in user can look up a report by ID; it's only ever returned once approved
// (this is how patients view/download their reports).
router.get('/:resultId', requireAuth, viewApprovedReport);

module.exports = router;