const express = require('express');
const router = express.Router();
const { initiatePayment, paymentCallback, markRefunded } = require('../controllers/paymentController');
const { downloadInvoice } = require('../controllers/invoiceController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

router.post('/:bookingId/initiate', requireAuth, requireRole('patient'), initiatePayment);
router.get('/callback', paymentCallback);
router.put('/:bookingId/refund', requireAuth, requireRole('admin'), markRefunded);
router.get('/:bookingId/invoice', requireAuth, requireRole('patient', 'admin'), downloadInvoice);

module.exports = router;