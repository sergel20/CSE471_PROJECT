import { useEffect, useState } from 'react';
import apiClient from '../api/client';

const URGENCY_STYLES = {
  Low: 'bg-gray-100 text-gray-700',
  Medium: 'bg-sky-100 text-sky-700',
  High: 'bg-orange-100 text-orange-700',
  Emergency: 'bg-red-100 text-red-700',
};

const STATUS_STYLES = {
  Pending: 'bg-amber-100 text-amber-700',
  Accepted: 'bg-sky-100 text-sky-700',
  'Ready for Pickup': 'bg-emerald-100 text-emerald-700',
  Completed: 'bg-gray-200 text-gray-700',
  Rejected: 'bg-red-100 text-red-700',
};

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function Badge({ label, styles }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
        styles[label] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {label}
    </span>
  );
}

// Owns its own draft input state for preparation time / response message so typing in one
// card never re-renders the whole list. Calls back up to the page for the actual API work.
function AssignedRequestCard({
  request,
  busy,
  onUpdatePreparationTime,
  onUpdateResponseMessage,
  onMarkReady,
  onMarkComplete,
}) {
  const [preparationTime, setPreparationTime] = useState(request.pharmacyResponse?.preparationTime || '');
  const [responseMessage, setResponseMessage] = useState(request.pharmacyResponse?.responseMessage || '');
  const canEdit = request.requestStatus === 'Accepted' || request.requestStatus === 'Ready for Pickup';

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">
            {request.medicineName}{' '}
            <span className="font-normal text-gray-500">× {request.requestedQuantity}</span>
          </p>
          <p className="text-sm text-gray-500">
            {request.patientName} — {request.location}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge label={request.urgencyLevel} styles={URGENCY_STYLES} />
          <Badge label={request.requestStatus} styles={STATUS_STYLES} />
        </div>
      </div>

      {request.prescription && (
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-gray-700">Prescription: </span>
          {request.prescription}
        </p>
      )}

      {canEdit ? (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex gap-2">
            <input
              value={preparationTime}
              onChange={(event) => setPreparationTime(event.target.value)}
              placeholder="e.g. 20 minutes"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <button
              type="button"
              disabled={busy || !preparationTime.trim()}
              onClick={() => onUpdatePreparationTime(request._id, preparationTime.trim())}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Update Time
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={responseMessage}
              onChange={(event) => setResponseMessage(event.target.value)}
              placeholder="Message to patient"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <button
              type="button"
              disabled={busy || !responseMessage.trim()}
              onClick={() => onUpdateResponseMessage(request._id, responseMessage.trim())}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        (request.pharmacyResponse?.preparationTime || request.pharmacyResponse?.responseMessage) && (
          <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-700">
            {request.pharmacyResponse.preparationTime && (
              <p>
                <span className="font-medium">Preparation time: </span>
                {request.pharmacyResponse.preparationTime}
              </p>
            )}
            {request.pharmacyResponse.responseMessage && (
              <p>
                <span className="font-medium">Message: </span>
                {request.pharmacyResponse.responseMessage}
              </p>
            )}
          </div>
        )
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400">Updated {formatDateTime(request.updatedAt)}</p>
        {request.requestStatus === 'Accepted' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMarkReady(request._id)}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark Ready for Pickup
          </button>
        )}
        {request.requestStatus === 'Ready for Pickup' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMarkComplete(request._id)}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark Completed
          </button>
        )}
      </div>
    </div>
  );
}

function PharmacyMedicineRequestsPage() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [assignedRequests, setAssignedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const [pendingRes, assignedRes] = await Promise.all([
        apiClient.get('/medicine-requests'),
        apiClient.get('/medicine-requests/assigned'),
      ]);
      setPendingRequests(Array.isArray(pendingRes.data.requests) ? pendingRes.data.requests : []);
      setAssignedRequests(Array.isArray(assignedRes.data.requests) ? assignedRes.data.requests : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load medicine requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const runAction = async (id, action, successMessage) => {
    setBusyId(id);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
      await loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update medicine request.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAccept = (id) =>
    runAction(id, () => apiClient.put(`/medicine-requests/${id}/accept`), 'Request accepted.');

  const handleReject = (id) => {
    const confirmed = window.confirm('Reject this medicine request? This cannot be undone.');
    if (!confirmed) return;
    runAction(id, () => apiClient.put(`/medicine-requests/${id}/reject`), 'Request rejected.');
  };

  const handleUpdatePreparationTime = (id, preparationTime) =>
    runAction(
      id,
      () => apiClient.put(`/medicine-requests/${id}/preparation-time`, { preparationTime }),
      'Preparation time updated.'
    );

  const handleUpdateResponseMessage = (id, responseMessage) =>
    runAction(
      id,
      () => apiClient.put(`/medicine-requests/${id}/response-message`, { responseMessage }),
      'Message sent to patient.'
    );

  const handleMarkReady = (id) =>
    runAction(id, () => apiClient.put(`/medicine-requests/${id}/ready`), 'Request marked ready for pickup.');

  const handleMarkComplete = (id) =>
    runAction(id, () => apiClient.put(`/medicine-requests/${id}/complete`), 'Request marked completed.');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Medicine Requests</h1>
        <p className="mt-2 text-sm text-gray-500">
          Respond to urgent medicine requests from patients. Accepting a request claims it — reject
          the ones you can't fulfill so other pharmacies aren't blocked from seeing them.
        </p>
      </div>

      {(error || message) && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Open Requests</h2>
          <span className="text-sm text-gray-500">
            {pendingRequests.length} request{pendingRequests.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading open requests...</p>
        ) : pendingRequests.length === 0 ? (
          <p className="text-gray-500">No open medicine requests right now.</p>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={request._id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {request.medicineName}{' '}
                      <span className="font-normal text-gray-500">× {request.requestedQuantity}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      {request.patientName} — {request.location}
                    </p>
                  </div>
                  <Badge label={request.urgencyLevel} styles={URGENCY_STYLES} />
                </div>

                {request.prescription && (
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-medium text-gray-700">Prescription: </span>
                    {request.prescription}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-400">Submitted {formatDateTime(request.createdAt)}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === request._id}
                      onClick={() => handleAccept(request._id)}
                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={busyId === request._id}
                      onClick={() => handleReject(request._id)}
                      className="rounded-lg border border-red-600 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Assigned Requests</h2>
          <span className="text-sm text-gray-500">
            {assignedRequests.length} request{assignedRequests.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading your assigned requests...</p>
        ) : assignedRequests.length === 0 ? (
          <p className="text-gray-500">You haven't accepted any requests yet.</p>
        ) : (
          <div className="space-y-4">
            {assignedRequests.map((request) => (
              <AssignedRequestCard
                key={request._id}
                request={request}
                busy={busyId === request._id}
                onUpdatePreparationTime={handleUpdatePreparationTime}
                onUpdateResponseMessage={handleUpdateResponseMessage}
                onMarkReady={handleMarkReady}
                onMarkComplete={handleMarkComplete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PharmacyMedicineRequestsPage;
