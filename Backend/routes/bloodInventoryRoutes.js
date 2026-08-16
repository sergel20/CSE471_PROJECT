const express = require('express');
const router = express.Router();
const {
  addBloodUnit,
  getInventory,
  getInventoryById,
  updateBloodUnit,
  deleteBloodUnit,
  getLowStockAlerts,
  getExpiryAlerts,
} = require('../controllers/bloodInventoryController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

router.get('/alerts/low-stock', requireAuth, requireRole('hospital_staff', 'admin'), getLowStockAlerts);
router.get('/alerts/expiry', requireAuth, requireRole('hospital_staff', 'admin'), getExpiryAlerts);

router.get('/', requireAuth, getInventory);
router.post('/', requireAuth, requireRole('hospital_staff', 'admin'), addBloodUnit);

router.get('/:id', requireAuth, getInventoryById);
router.put('/:id', requireAuth, requireRole('hospital_staff', 'admin'), updateBloodUnit);
router.delete('/:id', requireAuth, requireRole('hospital_staff', 'admin'), deleteBloodUnit);

module.exports = router;