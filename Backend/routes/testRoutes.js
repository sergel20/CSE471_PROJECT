const express = require('express');
const router = express.Router();
const DiagnosticTest = require('../models/DiagnosticTest');

// POST: Create a new diagnostic test
const createTest = async (req, res) => {
  try {
    const newTest = new DiagnosticTest(req.body);
    const savedTest = await newTest.save();
    res.status(201).json(savedTest);
  } catch (error) {
    res.status(400).json({ message: 'Error creating test', error: error.message });
  }
};

// GET: Fetch all tests OR a single test by ID via query parameter
const getTests = async (req, res) => {
  try {
    // Check if there is an ID in the query string (e.g., /api/tests?id=123)
    if (req.query.id) {
      const test = await DiagnosticTest.findById(req.query.id);
      if (!test) {
        return res.status(404).json({ message: 'Test not found' });
      }
      return res.status(200).json(test);
    }
    
    // If no ID is provided, return all tests
    const tests = await DiagnosticTest.find();
    res.status(200).json(tests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching', error: error.message });
  }
};

// PUT: Update a diagnostic test via query parameter
const updateTest = async (req, res) => {
  try {
    // Add a quick check to ensure they provided an ID in the query
    if (!req.query.id) {
      return res.status(400).json({ message: 'Test ID is required in query parameters.' });
    }

    const updatedTest = await DiagnosticTest.findByIdAndUpdate(
      req.query.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedTest) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.status(200).json(updatedTest);
  } catch (error) {
    res.status(400).json({ message: 'Error updating test', error: error.message });
  }
};

// DELETE: Delete a diagnostic test via query parameter
const deleteTest = async (req, res) => {
  try {
    // Add a quick check to ensure they provided an ID in the query
    if (!req.query.id) {
      return res.status(400).json({ message: 'Test ID is required in query parameters.' });
    }

    const deletedTest = await DiagnosticTest.findByIdAndDelete(req.query.id);
    if (!deletedTest) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.status(200).json({ message: 'Test deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting test', error: error.message });
  }
};

// Map endpoints to controller logic
router.post('/', createTest);
router.get('/', getTests); // Handles both GET ALL and GET SINGLE
router.put('/', updateTest);
router.delete('/', deleteTest);

module.exports = router;