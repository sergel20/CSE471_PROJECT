const Booking = require('../models/Booking');
const Result = require('../models/Result');
const User = require('../models/User');

const calculateFlag = (value, min, max) => {
  if (![value, min, max].every(Number.isFinite) || min > max) return 'Abnormal';
  if (value > max) return 'High';
  if (value < min) return 'Low';
  return 'Normal';
};

function parseResultValues(body, sample) {
  const observedValue = Number(body.observedValue);
  const unit = String(body.unit || sample.unit || '').trim();
  const min = Number(body.referenceRange?.min ?? sample.referenceRange?.min);
  const max = Number(body.referenceRange?.max ?? sample.referenceRange?.max);

  if (!Number.isFinite(observedValue)) {
    const error = new Error('Observed value must be a valid number.');
    error.status = 400;
    throw error;
  }
  if (!unit) {
    const error = new Error('Unit is required.');
    error.status = 400;
    throw error;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    const error = new Error('Reference range must contain a valid minimum and maximum.');
    error.status = 400;
    throw error;
  }

  return { observedValue, unit, referenceRange: { min, max }, flag: calculateFlag(observedValue, min, max) };
}

function buildResultQuery(query) {
  const filter = { booking: { $exists: true } };
  if (query.sampleId) filter.sampleId = query.sampleId.trim().toUpperCase();
  if (query.testName) filter.testName = query.testName;
  if (query.flag) filter.flag = query.flag;
  if (query.approvalStatus) filter.approvalStatus = query.approvalStatus;
  if (query.date) {
    const start = new Date(query.date);
    if (!Number.isNaN(start.getTime())) {
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }
  }
  return filter;
}

const createResult = async (req, res) => {
  try {
    const sampleId = String(req.body.sampleId || '').trim().toUpperCase();
    if (!sampleId) return res.status(400).json({ message: 'Select a released sample.' });

    const booking = await Booking.findOne({
      bookingStatus: 'Confirmed',
      'tests.sampleId': sampleId,
    });
    if (!booking) return res.status(404).json({ message: 'Confirmed sample not found.' });

    const sample = booking.tests.find((item) => item.sampleId === sampleId);
    if (sample.sampleStatus !== 'Under Processing') {
      return res.status(409).json({
        message: 'The admin must move this sample to Under Processing before result entry.',
      });
    }

    if (await Result.exists({ sampleId })) {
      return res.status(409).json({ message: 'A result already exists for this sample.' });
    }

    const values = parseResultValues(req.body, sample);
    const result = await Result.create({
      booking: booking._id,
      test: sample.test,
      sampleId,
      testName: sample.testName,
      ...values,
      enteredBy: req.user.id,
      approvalStatus: 'Pending Approval',
    });

    const staff = await User.findById(req.user.id).select('name');
    sample.result = result._id;
    sample.sampleStatus = 'Result Ready';
    sample.statusHistory.push({
      status: 'Result Ready',
      updatedBy: staff?.name || 'Lab Staff',
    });

    try {
      await booking.save();
    } catch (error) {
      await Result.findByIdAndDelete(result._id);
      throw error;
    }

    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Error creating result.' });
  }
};

const getResults = async (req, res) => {
  try {
    if (req.query.id) {
      const result = await Result.findById(req.query.id).populate('booking');
      if (!result) return res.status(404).json({ message: 'Result not found.' });
      return res.status(200).json(result);
    }

    const results = await Result.find(buildResultQuery(req.query))
      .populate('booking', 'patient patientInfo preferredDate')
      .sort({ createdAt: -1 });
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching results', error: error.message });
  }
};

const updateResult = async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ message: 'Result ID is required.' });
    const result = await Result.findById(req.query.id);
    if (!result) return res.status(404).json({ message: 'Result not found.' });
    if (result.approvalStatus === 'Approved') {
      return res.status(409).json({ message: 'An approved result cannot be edited.' });
    }

    const booking = await Booking.findById(result.booking);
    const sample = booking?.tests.find((item) => item.sampleId === result.sampleId);
    if (!booking || !sample) {
      return res.status(409).json({ message: 'This result is no longer linked to a valid sample.' });
    }

    const values = parseResultValues(req.body, sample);
    Object.assign(result, values, {
      approvalStatus: 'Pending Approval',
      approvedBy: null,
      approvedByUser: null,
      approvedAt: null,
      rejectionReason: null,
    });
    await result.save();

    const staff = await User.findById(req.user.id).select('name');
    sample.sampleStatus = 'Result Ready';
    sample.result = result._id;
    sample.statusHistory.push({
      status: 'Result Ready',
      updatedBy: staff?.name || 'Lab Staff',
    });
    await booking.save();

    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Error updating result.' });
  }
};

const deleteResult = async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ message: 'Result ID is required.' });
    const result = await Result.findById(req.query.id);
    if (!result) return res.status(404).json({ message: 'Result not found.' });
    if (result.approvalStatus === 'Approved') {
      return res.status(409).json({ message: 'An approved result cannot be deleted.' });
    }

    const booking = await Booking.findById(result.booking);
    const sample = booking?.tests.find((item) => item.sampleId === result.sampleId);
    if (sample) {
      const staff = await User.findById(req.user.id).select('name');
      sample.result = null;
      sample.sampleStatus = 'Under Processing';
      sample.statusHistory.push({
        status: 'Under Processing',
        updatedBy: staff?.name || 'Lab Staff',
      });
      await booking.save();
    }

    await result.deleteOne();
    res.status(200).json({ message: 'Result deleted; the sample returned to Under Processing.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting result', error: error.message });
  }
};

module.exports = { createResult, getResults, updateResult, deleteResult };
