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

// Only lab staff enter results for samples released by the admin.
router.post('/', requireAuth, requireRole('lab_staff'), createResult);
router.get('/', requireAuth, requireRole('lab_staff', 'doctor', 'admin'), getResults);
router.put('/', requireAuth, requireRole('lab_staff'), updateResult);
router.delete('/', requireAuth, requireRole('lab_staff'), deleteResult);

module.exports = router;
