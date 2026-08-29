import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  patientName: '',
  medicineName: '',
  requestedQuantity: '',
  location: '',
  urgencyLevel: 'Medium',
  prescriptionRequired: false,
  prescription: '',
};

const URGENCY_LEVELS = ['Low', 'Medium', 'High', 'Emergency'];

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

function MedicineRequestPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm, patientName: user?.name || '' });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/medicine-requests/me');
      setRequests(Array.isArray(data.requests) ? data.requests : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your medicine requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddNew = () => {
    setForm({ ...emptyForm, patientName: user?.name || '' });
    setShowForm(true);
    setMessage('');
    setError('');
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const payload = {
      patientName: form.patientName.trim(),
      medicineName: form.medicineName.trim(),
      requestedQuantity: Number(form.requestedQuantity),
      location: form.location.trim(),
      urgencyLevel: form.urgencyLevel,
      prescriptionRequired: form.prescriptionRequired,
      prescription: form.prescription.trim(),
    };

    try {
      await apiClient.post('/medicine-requests', payload);
      setMessage('Medicine request submitted.');
      setForm({ ...emptyForm, patientName: user?.name || '' });
      setShowForm(false);
      await loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit medicine request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medicine Requests</h1>
          <p className="mt-2 text-sm text-gray-500">
            Submit an urgent medicine request and track how the responding pharmacy is handling it.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={handleAddNew}
            className="shrink-0 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            + New Request
          </button>
        )}
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

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8 max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Medicine Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                <input
                  name="patientName"
                  value={form.patientName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name</label>
                <input
                  name="medicineName"
                  value={form.medicineName}
                  onChange={handleChange}
                  required
                  placeholder="Napa Extra"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Required Quantity</label>
                <input
                  name="requestedQuantity"
                  type="number"
                  min="1"
                  value={form.requestedQuantity}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency Level</label>
                <select
                  name="urgencyLevel"
                  value={form.urgencyLevel}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  {URGENCY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Location</label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                required
                placeholder="Dhanmondi, Dhaka"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                name="prescriptionRequired"
                type="checkbox"
                checked={form.prescriptionRequired}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-200"
              />
              I have a prescription for this medicine
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prescription Details (optional)
              </label>
              <textarea
                name="prescription"
                value={form.prescription}
                onChange={handleChange}
                rows={3}
                placeholder="Dosage, prescribing doctor, or any other relevant details"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className={`flex-1 rounded-lg px-4 py-3 font-semibold transition ${
                  saving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                {saving ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Requests</h2>
          <span className="text-sm text-gray-500">
            {requests.length} request{requests.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading your medicine requests...</p>
        ) : requests.length === 0 ? (
          <p className="text-gray-500">
            You haven't submitted any medicine requests yet. Click "New Request" to get started.
          </p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request._id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {request.medicineName}{' '}
                      <span className="font-normal text-gray-500">× {request.requestedQuantity}</span>
                    </p>
                    <p className="text-sm text-gray-500">{request.location}</p>
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

                {(request.pharmacyResponse?.pharmacyName ||
                  request.pharmacyResponse?.preparationTime ||
                  request.pharmacyResponse?.responseMessage) && (
                  <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm">
                    {request.pharmacyResponse.pharmacyName && (
                      <p className="text-gray-700">
                        <span className="font-medium">Pharmacy: </span>
                        {request.pharmacyResponse.pharmacyName}
                      </p>
                    )}
                    {request.pharmacyResponse.preparationTime && (
                      <p className="text-gray-700">
                        <span className="font-medium">Preparation time: </span>
                        {request.pharmacyResponse.preparationTime}
                      </p>
                    )}
                    {request.pharmacyResponse.responseMessage && (
                      <p className="text-gray-700">
                        <span className="font-medium">Message: </span>
                        {request.pharmacyResponse.responseMessage}
                      </p>
                    )}
                  </div>
                )}

                <p className="mt-3 text-xs text-gray-400">Submitted {formatDateTime(request.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MedicineRequestPage;
