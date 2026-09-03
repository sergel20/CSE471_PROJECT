const express = require('express');
const router = express.Router();
const {
  createRequest,
  getAllRequests,
  getRequestById,
  updateStatus,
  updateProgressNote,
  getRequestHistory,
} = require('../controllers/emergencyBloodRequestController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

router.use(requireAuth);
router.post('/', requireRole('patient', 'hospital_staff'), createRequest);
router.get('/', requireRole('patient', 'hospital_staff', 'admin'), getAllRequests);
router.get('/history', requireRole('patient', 'hospital_staff', 'admin'), getRequestHistory);
router.get('/:id', requireRole('patient', 'hospital_staff', 'admin'), getRequestById);
router.patch('/:id/status', requireRole('patient', 'hospital_staff', 'admin'), updateStatus);
router.patch('/:id/progress-note', requireRole('hospital_staff', 'admin'), updateProgressNote);

module.exports = router;
