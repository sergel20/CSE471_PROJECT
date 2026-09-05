const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  checkout,
} = require('../controllers/cartController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

router.get('/', requireAuth, requireRole('patient'), getCart);
router.post('/', requireAuth, requireRole('patient'), addToCart);
router.post('/checkout', requireAuth, requireRole('patient'), checkout);
router.put('/:itemId', requireAuth, requireRole('patient'), updateCartItem);
router.delete('/:itemId', requireAuth, requireRole('patient'), removeFromCart);

module.exports = router;