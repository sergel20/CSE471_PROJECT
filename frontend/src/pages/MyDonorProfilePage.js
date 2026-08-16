import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { DONATION_REQUESTS_CHANGED_EVENT } from '../components/Navbar';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const emptyForm = {
  fullName: '',
  bloodGroup: BLOOD_GROUPS[0],
  age: '',
  phone: '',
  location: '',
  lastDonationDate: '',
  available: true,
};

function formatDate(value) {
  if (!value) return 'Never donated';
  return new Date(value).toLocaleDateString();
}

function EligibilitySection({ eligibility, lastDonationDate }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Donation Eligibility</h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Last Donation</dt>
          <dd className="font-medium text-gray-900">{formatDate(lastDonationDate)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Status</dt>
          <dd>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                eligibility.eligible
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {eligibility.eligible ? 'Eligible' : 'Not Eligible'}
            </span>
          </dd>
        </div>
        {eligibility.nextEligibleDate && (
          <div className="flex justify-between">
            <dt className="text-gray-500">Next Eligible Date</dt>
            <dd className="font-medium text-gray-900">{formatDate(eligibility.nextEligibleDate)}</dd>
          </div>
        )}
      </dl>
      {!eligibility.eligible && eligibility.reasons?.length > 0 && (
        <ul className="mt-3 list-disc list-inside space-y-1 text-sm text-amber-700">
          {eligibility.reasons.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestCard({ request, onAccept, onReject, busy }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-3 last:mb-0">
      <dl className="space-y-1 text-sm mb-4">
        <div className="flex justify-between">
          <dt className="text-gray-500">Blood Group</dt>
          <dd className="font-medium text-gray-900">{request.bloodGroup}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Component</dt>
          <dd className="font-medium text-gray-900">{request.component}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Units</dt>
          <dd className="font-medium text-gray-900">{request.requiredUnits}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Hospital</dt>
          <dd className="font-medium text-gray-900">{request.hospital}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Location</dt>
          <dd className="font-medium text-gray-900">{request.location}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Urgency</dt>
          <dd className="font-medium text-gray-900">{request.urgency}</dd>
        </div>
      </dl>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onAccept(request._id)}
          disabled={busy}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${
            busy ? 'bg-gray-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => onReject(request._id)}
          disabled={busy}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            busy ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-red-600 text-red-700 hover:bg-red-50'
          }`}
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function MyDonorProfilePage() {
  const [form, setForm] = useState(emptyForm);
  const [lastDonationDate, setLastDonationDate] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const applyDonorData = (data) => {
    setHasProfile(true);
    setEligibility(data.eligibility);
    setLastDonationDate(data.lastDonationDate || null);
    setForm({
      fullName: data.fullName || '',
      bloodGroup: data.bloodGroup || BLOOD_GROUPS[0],
      age: data.age ?? '',
      phone: data.phone || '',
      location: data.location || '',
      lastDonationDate: data.lastDonationDate ? data.lastDonationDate.slice(0, 10) : '',
      available: data.available ?? true,
    });
  };

  const loadRequests = async () => {
    try {
      const { data } = await apiClient.get('/donation-requests/me');
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      // Non-fatal: the profile itself already loaded, so just leave the sidebar empty
      // rather than surfacing a second error banner.
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/donors/me');
      applyDonorData(data);
      setError('');
      await loadRequests();
    } catch (err) {
      if (err.response?.status === 404) {
        setHasProfile(false);
        setEligibility(null);
        setIsEditing(true);
      } else {
        setError(err.response?.data?.message || 'Failed to load your donor profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const payload = {
      fullName: form.fullName.trim(),
      bloodGroup: form.bloodGroup,
      age: Number(form.age),
      phone: form.phone.trim(),
      location: form.location.trim(),
      available: form.available,
      lastDonationDate: form.lastDonationDate || null,
    };

    try {
      const { data } = await apiClient.put('/donors/me', payload);
      applyDonorData(data);
      setMessage(hasProfile ? 'Donor profile updated successfully.' : 'Donor profile created successfully.');
      setIsEditing(false);
      await loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save donor profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete your donor profile?');
    if (!confirmed) return;

    try {
      setMessage('');
      setError('');
      await apiClient.delete('/donors/me');
      setHasProfile(false);
      setEligibility(null);
      setLastDonationDate(null);
      setForm(emptyForm);
      setIsEditing(true);
      setRequests([]);
      setMessage('Donor profile deleted successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete donor profile.');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    setActiveRequestId(requestId);
    setMessage('');
    setError('');

    try {
      const { data } = await apiClient.put(`/donation-requests/${requestId}/accept`);
      applyDonorData(data.donor);
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
      window.dispatchEvent(new Event(DONATION_REQUESTS_CHANGED_EVENT));
      setMessage('Donation request accepted — donation recorded and eligibility updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept donation request.');
    } finally {
      setActiveRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId) => {
    setActiveRequestId(requestId);
    setMessage('');
    setError('');

    try {
      await apiClient.put(`/donation-requests/${requestId}/reject`);
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
      window.dispatchEvent(new Event(DONATION_REQUESTS_CHANGED_EVENT));
      setMessage('Donation request rejected.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject donation request.');
    } finally {
      setActiveRequestId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading your donor profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Donor Profile</h1>
        <p className="mt-2 text-sm text-gray-500">
          {hasProfile
            ? 'Eligibility to donate is calculated automatically by the server.'
            : 'Create your donor profile. Eligibility to donate is calculated automatically.'}
        </p>
      </div>

      {(error || message) && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          {hasProfile && <EligibilitySection eligibility={eligibility} lastDonationDate={lastDonationDate} />}

          {hasProfile && !isEditing ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <dl className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Name</dt>
                  <dd className="font-medium text-gray-900">{form.fullName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Age</dt>
                  <dd className="font-medium text-gray-900">{form.age}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Blood Group</dt>
                  <dd className="font-medium text-gray-900">{form.bloodGroup}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="font-medium text-gray-900">{form.phone}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Location</dt>
                  <dd className="font-medium text-gray-900">{form.location}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Available to Donate</dt>
                  <dd>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        form.available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {form.available ? 'Available' : 'Unavailable'}
                    </span>
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Delete Profile
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    required
                    placeholder="Jane Doe"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <input
                      name="age"
                      type="number"
                      min="0"
                      max="120"
                      value={form.age}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                    <select
                      name="bloodGroup"
                      value={form.bloodGroup}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      {BLOOD_GROUPS.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      required
                      placeholder="01XXXXXXXXX"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      required
                      placeholder="Dhaka"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    name="available"
                    type="checkbox"
                    checked={form.available}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-200"
                  />
                  Currently available to donate
                </label>
                <p className="-mt-3 text-xs text-gray-400">
                  Turn this off if you don't want to be matched to emergency blood requests right now.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Donation Date (optional)
                  </label>
                  <input
                    name="lastDonationDate"
                    type="date"
                    value={form.lastDonationDate}
                    onChange={handleChange}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Leave blank if you've never donated before. Accepting a donation request also
                    updates this automatically.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className={`flex-1 rounded-lg px-4 py-3 font-semibold transition ${
                      saving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-sky-600 text-white hover:bg-sky-700'
                    }`}
                  >
                    {saving ? 'Saving...' : hasProfile ? 'Save Changes' : 'Create Profile'}
                  </button>
                  {hasProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>

        {hasProfile && (
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Donation Requests</h2>
              {requests.length === 0 ? (
                <p className="text-sm text-gray-400">No pending donation requests.</p>
              ) : (
                requests.map((request) => (
                  <RequestCard
                    key={request._id}
                    request={request}
                    onAccept={handleAcceptRequest}
                    onReject={handleRejectRequest}
                    busy={activeRequestId === request._id}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyDonorProfilePage;
