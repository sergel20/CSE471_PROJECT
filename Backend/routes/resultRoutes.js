const express = require('express');
const router = express.Router();
const {
  createResult,
  getResults,
  updateResult,
  deleteResult
} = require('../controllers/resultController');

// Map endpoints to controller logic using query parameters
router.post('/', createResult);
router.get('/', getResults);
router.put('/', updateResult);
router.delete('/', deleteResult);

module.exports = router;