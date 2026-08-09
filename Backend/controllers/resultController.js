const Result = require('../models/Result');

// Helper to determine the flag automatically
const calculateFlag = (value, min, max) => {
  if (![value, min, max].every((entry) => Number.isFinite(entry)) || min > max) {
    return 'Abnormal';
  }

  if (value > max) return 'High';
  if (value < min) return 'Low';
  return 'Normal';
};

const buildResultQuery = (query) => {
  const mongoQuery = {};

  if (query.sampleId) {
    mongoQuery.sampleId = query.sampleId;
  }

  if (query.testName) {
    mongoQuery.testName = query.testName;
  }

  if (query.flag) {
    mongoQuery.flag = query.flag;
  }

  if (query.date) {
    const start = new Date(query.date);
    if (!Number.isNaN(start.getTime())) {
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      mongoQuery.createdAt = {
        $gte: start,
        $lt: end,
      };
    }
  }

  return mongoQuery;
};

// POST: Create a new result entry
const createResult = async (req, res) => {
  try {
    const { sampleId, testName, observedValue, unit, referenceRange } = req.body;

    if (!sampleId || !String(sampleId).trim()) {
      return res.status(400).json({ message: 'Sample ID is required.' });
    }

    if (!testName || !String(testName).trim()) {
      return res.status(400).json({ message: 'Test name is required.' });
    }

    if (!Number.isFinite(Number(observedValue))) {
      return res.status(400).json({ message: 'Observed value must be a valid number.' });
    }

    if (!unit || !String(unit).trim()) {
      return res.status(400).json({ message: 'Unit is required.' });
    }

    if (!referenceRange || !Number.isFinite(Number(referenceRange.min)) || !Number.isFinite(Number(referenceRange.max))) {
      return res.status(400).json({ message: 'Reference range must include valid minimum and maximum values.' });
    }
    
    // Automatically calculate the flag before saving
    const numericValue = Number(observedValue);
    const numericMin = Number(referenceRange.min);
    const numericMax = Number(referenceRange.max);
    const flag = calculateFlag(numericValue, numericMin, numericMax);

    const newResult = new Result({
      sampleId: String(sampleId).trim(),
      testName: String(testName).trim(),
      observedValue: numericValue,
      unit: String(unit).trim(),
      referenceRange: {
        min: numericMin,
        max: numericMax,
      },
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
    // If querying by the specific MongoDB database ID
    if (req.query.id) {
      const result = await Result.findById(req.query.id);
      if (!result) return res.status(404).json({ message: 'Result not found' });
      return res.status(200).json(result);
    }

    const mongoQuery = buildResultQuery(req.query);
    const allResults = await Result.find(mongoQuery).sort({ createdAt: -1 });
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

    if (updatedData.sampleId !== undefined) {
      if (!String(updatedData.sampleId).trim()) {
        return res.status(400).json({ message: 'Sample ID cannot be empty.' });
      }
      updatedData.sampleId = String(updatedData.sampleId).trim();
    }

    if (updatedData.testName !== undefined) {
      if (!String(updatedData.testName).trim()) {
        return res.status(400).json({ message: 'Test name cannot be empty.' });
      }
      updatedData.testName = String(updatedData.testName).trim();
    }

    if (updatedData.unit !== undefined) {
      if (!String(updatedData.unit).trim()) {
        return res.status(400).json({ message: 'Unit cannot be empty.' });
      }
      updatedData.unit = String(updatedData.unit).trim();
    }

    if (updatedData.observedValue !== undefined && !Number.isFinite(Number(updatedData.observedValue))) {
      return res.status(400).json({ message: 'Observed value must be a valid number.' });
    }

    if (updatedData.referenceRange) {
      const nextMin = Number(updatedData.referenceRange.min);
      const nextMax = Number(updatedData.referenceRange.max);

      if (!Number.isFinite(nextMin) || !Number.isFinite(nextMax)) {
        return res.status(400).json({ message: 'Reference range must include valid minimum and maximum values.' });
      }

      updatedData.referenceRange = { min: nextMin, max: nextMax };
    }
    
    // Determine the values to use for the new flag calculation
    const newValue = updatedData.observedValue !== undefined ? Number(updatedData.observedValue) : existingResult.observedValue;
    const newMin = updatedData.referenceRange?.min !== undefined ? Number(updatedData.referenceRange.min) : existingResult.referenceRange.min;
    const newMax = updatedData.referenceRange?.max !== undefined ? Number(updatedData.referenceRange.max) : existingResult.referenceRange.max;

    if (updatedData.observedValue !== undefined) {
      updatedData.observedValue = Number(updatedData.observedValue);
    }

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