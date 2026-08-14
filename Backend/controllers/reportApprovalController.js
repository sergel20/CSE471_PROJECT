const Result = require('../models/Result');

// PUT /api/report-approval/:resultId
// Doctor approves or rejects a submitted result/report
const reviewReport = async (req, res) => {
  try {
    const { decision, rejectionReason, approvedBy } = req.body; // decision: "approve" | "reject"

    const result = await Result.findById(req.params.resultId);
    if (!result) {
      return res.status(404).json({ message: 'Result/report not found' });
    }

    if (decision === 'approve') {
      result.approvalStatus = 'Approved';
      result.approvedBy = approvedBy || 'Doctor';
      result.approvedAt = new Date();
      result.rejectionReason = null;
    } else if (decision === 'reject') {
      result.approvalStatus = 'Rejected';
      result.rejectionReason = rejectionReason || 'Not specified';
      result.approvedBy = null;
      result.approvedAt = null;
    } else {
      return res.status(400).json({ message: "decision must be 'approve' or 'reject'" });
    }

    await result.save();
    res.status(200).json({ message: `Report ${result.approvalStatus}`, result });
  } catch (error) {
    res.status(400).json({ message: 'Error reviewing report', error: error.message });
  }
};

// GET /api/report-approval/:resultId
// Patient views/downloads the report - ONLY if approved
const viewApprovedReport = async (req, res) => {
  try {
    const result = await Result.findById(req.params.resultId);
    if (!result) {
      return res.status(404).json({ message: 'Result/report not found' });
    }

    if (result.approvalStatus !== 'Approved') {
      return res.status(403).json({
        message: 'This report has not been approved by the doctor yet. It cannot be viewed or downloaded.',
      });
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching report', error: error.message });
  }
};

// GET /api/report-approval/pending
// Doctor's queue - all reports awaiting approval
const getPendingReports = async (req, res) => {
  try {
    const pending = await Result.find({ approvalStatus: 'Pending Approval' }).sort({ createdAt: -1 });
    res.status(200).json(pending);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending reports', error: error.message });
  }
};

module.exports = { reviewReport, viewApprovedReport, getPendingReports };