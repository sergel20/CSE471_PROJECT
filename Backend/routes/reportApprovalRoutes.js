const express = require('express');
const router = express.Router();
const {
  reviewReport,
  viewApprovedReport,
  getPendingReports,
} = require('../controllers/reportApprovalController');

router.get('/pending', getPendingReports);
router.get('/:resultId', viewApprovedReport);
router.put('/:resultId', reviewReport);

module.exports = router;