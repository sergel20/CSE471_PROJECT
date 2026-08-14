const express = require('express');
const router = express.Router();
const {
  reviewReport,
  viewApprovedReport,
  getPendingReports,
} = require('../controllers/reportApprovalController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Result Ready is owned by lab staff; only doctors can apply Approved/Rejected.
router.get('/pending', requireAuth, requireRole('doctor'), getPendingReports);
router.put('/:resultId', requireAuth, requireRole('doctor'), reviewReport);
router.get('/:resultId', requireAuth, requireRole('patient', 'doctor'), viewApprovedReport);

module.exports = router;
