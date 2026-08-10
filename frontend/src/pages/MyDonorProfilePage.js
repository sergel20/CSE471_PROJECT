import { useEffect, useState } from 'react';
import apiClient from '../api/client';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const HEALTH_STATUSES = ['Healthy', 'Minor Illness', 'Chronic Condition', 'Not Fit'];

const emptyForm = {
  fullName: '',
  bloodGroup: BLOOD_GROUPS[0],
  age: '',
  phone: '',
  location: '',
  lastDonationDate: '',
  healthStatus: HEALTH_STATUSES[0],
  availability: true,
};

function EligibilityPanel({ eligibility }) {
  if (!eligibility) return null;
  return (
    <div
      className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
        eligibility.eligible
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      <p className="font-semibold">
        {eligibility.eligible
          ? 'You are currently eligible to donate.'
          : 'You are not currently eligible to donate.'}
      </p>
      {!eligibility.eligible && eligibility.reasons?.length > 0 && (
        <ul className="mt-2 list-disc list-inside space-y-1">
          {eligibility.reasons.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      )}
      {eligibility.nextEligibleDate && (
        <p className="mt-2 text-xs">
          Next eligible date: {new Date(eligibility.nextEligibleDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

function MyDonorProfilePage() {
  const [form, setForm] = useState(emptyForm);
  const [eligibility, setEligibility] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/donors/me');
      setHasProfile(true);
      setEligibility(data.eligibility);
      setForm({
        fullName: data.fullName || '',
        bloodGroup: data.bloodGroup || BLOOD_GROUPS[0],
        age: data.age ?? '',
        phone: data.phone || '',
        location: data.location || '',
        lastDonationDate: data.lastDonationDate ? data.lastDonationDate.slice(0, 10) : '',
        healthStatus: data.healthStatus || HEALTH_STATUSES[0],
        availability: !!data.availability,
      });
      setError('');
    } catch (err) {
      if (err.response?.status === 404) {
        setHasProfile(false);
        setEligibility(null);
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
      lastDonationDate: form.lastDonationDate || null,
      healthStatus: form.healthStatus,
      availability: form.availability,
    };

    try {
      const { data } = await apiClient.put('/donors/me', payload);
      setEligibility(data.eligibility);
      setMessage(hasProfile ? 'Donor profile updated successfully.' : 'Donor profile created successfully.');
      setHasProfile(true);
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
      setForm(emptyForm);
      setMessage('Donor profile deleted successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete donor profile.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading your donor profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Donor Profile</h1>
        <p className="mt-2 text-sm text-gray-500">
          {hasProfile
            ? 'Update your details below. Eligibility to donate is recalculated automatically.'
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

      <EligibilityPanel eligibility={eligibility} />

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Donation Date
              </label>
              <input
                name="lastDonationDate"
                type="date"
                value={form.lastDonationDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
              <p className="mt-1 text-xs text-gray-400">Leave blank if never donated before.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Health Status</label>
              <select
                name="healthStatus"
                value={form.healthStatus}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                {HEALTH_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="availability"
              checked={form.availability}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-400"
            />
            Currently available to donate
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 rounded-lg px-4 py-3 font-semibold transition ${
                saving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
            >
              {saving ? 'Saving...' : hasProfile ? 'Update Profile' : 'Create Profile'}
            </button>
            {hasProfile && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg border border-red-600 px-4 py-3 font-semibold text-red-700 hover:bg-red-50"
              >
                Delete Profile
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default MyDonorProfilePage;
