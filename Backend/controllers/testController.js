const DiagnosticTest = require('../models/DiagnosticTest');

// Create a new diagnostic test
const createTest = async (req, res) => {
  try {
    const newTest = new DiagnosticTest(req.body);
    const savedTest = await newTest.save();
    res.status(201).json(savedTest);
  } catch (error) {
    res.status(400).json({ message: 'Error creating test', error: error.message });
  }
};

// Get all diagnostic tests
const getTests = async (req, res) => {
  try {
    const tests = await DiagnosticTest.find();
    res.status(200).json(tests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tests', error: error.message });
  }
};

// Get a single diagnostic test by ID
const getTestById = async (req, res) => {
  try {
    const test = await DiagnosticTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.status(200).json(test);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching test', error: error.message });
  }
};

// Update a diagnostic test
const updateTest = async (req, res) => {
  try {
    const updatedTest = await DiagnosticTest.findByIdAndUpdate(
      req.params.id,
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

// Delete a diagnostic test
const deleteTest = async (req, res) => {
  try {
    const deletedTest = await DiagnosticTest.findByIdAndDelete(req.params.id);
    if (!deletedTest) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.status(200).json({ message: 'Test deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting test', error: error.message });
  }
};

module.exports = {
  createTest,
  getTests,
  getTestById,
  updateTest,
  deleteTest
};