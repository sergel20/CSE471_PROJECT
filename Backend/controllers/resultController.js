const Result = require('../models/Result');

// Helper to determine the flag automatically
const calculateFlag = (value, min, max) => {
  if (value > max) return 'High';
  if (value < min) return 'Low';
  return 'Normal';
};

// POST: Create a new result entry
const createResult = async (req, res) => {
  try {
    const { sampleId, testName, observedValue, unit, referenceRange } = req.body;
    
    // Automatically calculate the flag before saving
    const flag = calculateFlag(observedValue, referenceRange.min, referenceRange.max);

    const newResult = new Result({
      sampleId,
      testName,
      observedValue,
      unit,
      referenceRange,
      flag
    });

    const savedResult = await newResult.save();
    res.status(201).json(savedResult);
  } catch (error) {
    res.status(400).json({ message: 'Error creating result', error: error.message });
  }
};

// GET: Fetch results (by sampleId, by ID, or all)
const getResults = async (req, res) => {
  try {
    // If querying by sample ID (e.g., ?sampleId=LAB-2026-0001)
    if (req.query.sampleId) {
      const results = await Result.find({ sampleId: req.query.sampleId });
      return res.status(200).json(results);
    }
    
    // If querying by the specific MongoDB database ID
    if (req.query.id) {
      const result = await Result.findById(req.query.id);
      if (!result) return res.status(404).json({ message: 'Result not found' });
      return res.status(200).json(result);
    }

    // Default: return all results
    const allResults = await Result.find();
    res.status(200).json(allResults);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching results', error: error.message });
  }
};

// PUT: Update an existing result and recalculate the flag
// PUT: Update an existing result and recalculate the flag
const updateResult = async (req, res) => {
  try {
    let existingResult;

    // Check how the user is trying to find the result to update
    if (req.query.id) {
      // Method 1: Find by exact MongoDB ID
      existingResult = await Result.findById(req.query.id);
    } else if (req.query.sampleId && req.query.testName) {
      // Method 2: Find by Sample ID + Test Name
      existingResult = await Result.findOne({ 
        sampleId: req.query.sampleId, 
        testName: req.query.testName 
      });
    } else {
      // If they didn't provide enough information
      return res.status(400).json({ 
        message: 'Please provide either ?id=... OR both ?sampleId=... and ?testName=...' 
      });
    }

    // If no matching result was found in the database
    if (!existingResult) {
      return res.status(404).json({ message: 'Result not found' });
    }

    const updatedData = { ...req.body };
    
    // Determine the values to use for the new flag calculation
    const newValue = updatedData.observedValue !== undefined ? updatedData.observedValue : existingResult.observedValue;
    const newMin = updatedData.referenceRange?.min !== undefined ? updatedData.referenceRange.min : existingResult.referenceRange.min;
    const newMax = updatedData.referenceRange?.max !== undefined ? updatedData.referenceRange.max : existingResult.referenceRange.max;

    // Helper function (ensure calculateFlag is defined at the top of your file!)
    updatedData.flag = calculateFlag(newValue, newMin, newMax);

    // Save the updates back to the database
    const finalResult = await Result.findByIdAndUpdate(
      existingResult._id, 
      updatedData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json(finalResult);
  } catch (error) {
    res.status(400).json({ message: 'Error updating result', error: error.message });
  }
};
// DELETE: Remove a result
const deleteResult = async (req, res) => {
  try {
    if (!req.query.id) {
      return res.status(400).json({ message: 'Result ID is required in query parameters.' });
    }

    const deletedResult = await Result.findByIdAndDelete(req.query.id);
    if (!deletedResult) {
      return res.status(404).json({ message: 'Result not found' });
    }
    res.status(200).json({ message: 'Result deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting result', error: error.message });
  }
};

module.exports = {
  createResult,
  getResults,
  updateResult,
  deleteResult
};