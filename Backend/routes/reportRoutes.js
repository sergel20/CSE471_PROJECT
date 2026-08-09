const express = require('express');

const {
  createReport,
  getAllReports,
  getReportHistory,
  downloadReport,
} = require('../controllers/reportController');

const router = express.Router();

router.post('/', createReport);
router.get('/', getAllReports);
router.get('/history/:phone', getReportHistory);
router.get('/download/:id', downloadReport);

module.exports = router;