const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const EmergencyBloodRequest = require('../models/EmergencyBloodRequest');
const {
  createRequest,
  updateStatus,
  updateProgressNote,
} = require('../controllers/emergencyBloodRequestController');

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function requestDocument(overrides = {}) {
  return new EmergencyBloodRequest({
    createdBy: new mongoose.Types.ObjectId(),
    bloodGroup: 'A+',
    componentType: 'Whole Blood',
    requiredUnits: 2,
    hospitalName: 'MediLab Hospital',
    location: 'Dhaka',
    contactNumber: '01700000000',
    urgencyLevel: 'Critical',
    requiredBy: new Date(Date.now() + 60 * 60 * 1000),
    ...overrides,
  });
}

test('request model accepts only the required priority and lifecycle values', async () => {
  const request = requestDocument();
  await request.validate();
  assert.equal(request.requestStatus, 'Submitted');

  request.urgencyLevel = 'Medium';
  await assert.rejects(request.validate(), /urgencyLevel/);
  request.urgencyLevel = 'Normal';
  request.requestStatus = 'Accepted';
  await assert.rejects(request.validate(), /requestStatus/);
});

test('creation assigns authenticated ownership and initial Submitted history', async (context) => {
  const userId = new mongoose.Types.ObjectId();
  let createdData;
  context.mock.method(EmergencyBloodRequest, 'create', async (data) => {
    createdData = data;
    return requestDocument(data);
  });
  const req = {
    user: { id: userId.toString(), role: 'patient' },
    body: {
      bloodGroup: 'O-', componentType: 'Red Blood Cells', requiredUnits: 1,
      hospitalName: 'City Hospital', location: 'Dhaka', contactNumber: '01800000000',
      urgencyLevel: 'High', requiredBy: new Date(Date.now() + 3600000).toISOString(),
    },
  };
  const res = responseRecorder();
  await createRequest(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createdData.createdBy, userId.toString());
  assert.equal(createdData.statusHistory[0].toStatus, 'Submitted');
  assert.equal(createdData.statusHistory[0].updatedByRole, 'patient');
});

test('creation rejects invalid priorities and past required-by times', async () => {
  const base = {
    bloodGroup: 'A+', componentType: 'Plasma', requiredUnits: 1,
    hospitalName: 'City Hospital', location: 'Dhaka', contactNumber: '01800000000',
    urgencyLevel: 'Medium', requiredBy: new Date(Date.now() - 1000).toISOString(),
  };
  const res = responseRecorder();
  await createRequest({ user: { id: new mongoose.Types.ObjectId().toString(), role: 'patient' }, body: base }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Critical, High, or Normal/);
});

test('hospital staff can follow the lifecycle in order and cannot skip a status', async (context) => {
  const managerId = new mongoose.Types.ObjectId();
  const request = requestDocument();
  context.mock.method(EmergencyBloodRequest, 'findById', async () => request);
  context.mock.method(request, 'save', async () => request);

  const skipped = responseRecorder();
  await updateStatus({ params: { id: request._id.toString() }, body: { status: 'In Progress' }, user: { id: managerId.toString(), role: 'hospital_staff' } }, skipped);
  assert.equal(skipped.statusCode, 409);

  for (const status of ['Under Verification', 'In Progress', 'Blood Arranged', 'Completed']) {
    const res = responseRecorder();
    await updateStatus({ params: { id: request._id.toString() }, body: { status }, user: { id: managerId.toString(), role: 'hospital_staff' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(request.requestStatus, status);
  }
  assert.equal(request.statusHistory.length, 4);
  assert.equal(request.statusHistory[3].toStatus, 'Completed');
  assert.ok(request.statusHistory.every((entry) => entry.updatedAt instanceof Date));
});

test('patient can cancel only their own Submitted request', async (context) => {
  const ownerId = new mongoose.Types.ObjectId();
  const strangerId = new mongoose.Types.ObjectId();
  const request = requestDocument({ createdBy: ownerId });
  context.mock.method(EmergencyBloodRequest, 'findById', async () => request);
  context.mock.method(request, 'save', async () => request);

  const forbidden = responseRecorder();
  await updateStatus({ params: { id: request._id.toString() }, body: { status: 'Cancelled' }, user: { id: strangerId.toString(), role: 'patient' } }, forbidden);
  assert.equal(forbidden.statusCode, 403);

  const allowed = responseRecorder();
  await updateStatus({ params: { id: request._id.toString() }, body: { status: 'Cancelled' }, user: { id: ownerId.toString(), role: 'patient' } }, allowed);
  assert.equal(allowed.statusCode, 200);
  assert.equal(request.requestStatus, 'Cancelled');

  const tooLate = responseRecorder();
  await updateStatus({ params: { id: request._id.toString() }, body: { status: 'Cancelled' }, user: { id: ownerId.toString(), role: 'patient' } }, tooLate);
  assert.equal(tooLate.statusCode, 409);
});

test('manager progress notes preserve timestamped history and the latest note', async (context) => {
  const managerId = new mongoose.Types.ObjectId();
  const request = requestDocument({ requestStatus: 'In Progress' });
  context.mock.method(EmergencyBloodRequest, 'findById', async () => request);
  context.mock.method(request, 'save', async () => request);
  const res = responseRecorder();

  await updateProgressNote({ params: { id: request._id.toString() }, body: { note: 'Blood arrangement in progress' }, user: { id: managerId.toString(), role: 'admin' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(request.latestProgressNote, 'Blood arrangement in progress');
  assert.equal(request.progressUpdates.length, 1);
  assert.equal(request.progressUpdates[0].status, 'In Progress');
  assert.ok(request.progressUpdates[0].updatedAt instanceof Date);
});
