const express = require('express');
const router = express.Router();
const { signup, login, getMe, listUsers, updateUserRole } = require('../controllers/authController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', requireAuth, getMe);

// Admin-only: manage user roles
router.get('/users', requireAuth, requireRole('admin'), listUsers);
router.put('/users/:id/role', requireAuth, requireRole('admin'), updateUserRole);

module.exports = router;
