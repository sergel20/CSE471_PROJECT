const express = require('express');

const { getMyReports, getReport, downloadReport } = require('../controllers/reportcontroller');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

router.get('/me', requireAuth, requireRole('patient'), getMyReports);
router.get('/:id/download', requireAuth, requireRole('patient', 'doctor', 'admin'), downloadReport);
router.get('/:id', requireAuth, requireRole('patient', 'doctor', 'admin'), getReport);

module.exports = router;
