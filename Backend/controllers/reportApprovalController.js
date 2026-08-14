const Booking = require('../models/Booking');
const Result = require('../models/Result');
const User = require('../models/User');

const reviewReport = async (req, res) => {
  try {
    const { decision, rejectionReason } = req.body;
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ message: "decision must be 'approve' or 'reject'." });
    }

    const result = await Result.findById(req.params.resultId);
    if (!result) return res.status(404).json({ message: 'Result not found.' });
    if (result.approvalStatus !== 'Pending Approval') {
      return res.status(409).json({ message: `This result is already ${result.approvalStatus}.` });
    }

    const booking = await Booking.findById(result.booking);
    const sample = booking?.tests.find((item) => item.sampleId === result.sampleId);
    if (!booking || !sample) {
      return res.status(409).json({ message: 'The result is not linked to a valid booking sample.' });
    }

    const doctor = await User.findById(req.user.id).select('name');
    const doctorName = doctor?.name || 'Doctor';

    if (decision === 'approve') {
      result.approvalStatus = 'Approved';
      result.approvedBy = doctorName;
      result.approvedByUser = req.user.id;
      result.approvedAt = new Date();
      result.rejectionReason = null;
      sample.sampleStatus = 'Approved';
      sample.statusHistory.push({ status: 'Approved', updatedBy: doctorName });
    } else {
      result.approvalStatus = 'Rejected';
      result.rejectionReason = String(rejectionReason || 'Not specified').trim();
      result.approvedBy = null;
      result.approvedByUser = null;
      result.approvedAt = null;
      // A rejected sample returns to the lab queue for correction and resubmission.
      sample.sampleStatus = 'Under Processing';
      sample.statusHistory.push({ status: 'Under Processing', updatedBy: doctorName });
    }

    await result.save();
    await booking.save();
    res.status(200).json({ message: `Result ${result.approvalStatus}.`, result });
  } catch (error) {
    res.status(500).json({ message: 'Error reviewing result', error: error.message });
  }
};

const viewApprovedReport = async (req, res) => {
  try {
    const result = await Result.findById(req.params.resultId).populate('booking');
    if (!result) return res.status(404).json({ message: 'Result not found.' });
    if (result.approvalStatus !== 'Approved') {
      return res.status(403).json({ message: 'This result has not been approved yet.' });
    }
    if (req.user.role === 'patient' && String(result.booking?.patient) !== req.user.id) {
      return res.status(404).json({ message: 'Report not found.' });
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching report', error: error.message });
  }
};

const getPendingReports = async (req, res) => {
  try {
    const pending = await Result.find({
      approvalStatus: 'Pending Approval',
      booking: { $exists: true },
    })
      .populate('booking', 'patientInfo preferredDate')
      .sort({ createdAt: -1 });
    res.status(200).json(pending);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending results', error: error.message });
  }
};

module.exports = { reviewReport, viewApprovedReport, getPendingReports };
