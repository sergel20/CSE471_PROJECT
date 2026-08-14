const express = require('express');
const router = express.Router();
const {
  createResult,
  getResults,
  updateResult,
  deleteResult
} = require('../controllers/resultController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Lab Staff enters/edits/deletes results; Doctor and Admin can view them (report review, oversight).
router.post('/', requireAuth, requireRole('lab_staff', 'admin'), createResult);
router.get('/', requireAuth, requireRole('lab_staff', 'doctor', 'admin'), getResults);
router.put('/', requireAuth, requireRole('lab_staff', 'admin'), updateResult);
router.delete('/', requireAuth, requireRole('lab_staff', 'admin'), deleteResult);

module.exports = router;