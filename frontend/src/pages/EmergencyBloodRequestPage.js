import { useState } from 'react';
import apiClient from '../api/client';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS = ['Whole Blood', 'Plasma', 'Platelets', 'RBC'];
const URGENCY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const DISTANCE_FILTERS = [
  { label: 'Any distance', value: '' },
  { label: 'Within 10 km', value: '10' },
  { label: 'Within 25 km', value: '25' },
  { label: 'Within 50 km', value: '50' },
  { label: 'Within 100 km', value: '100' },
];

const emptyForm = {
  bloodGroup: BLOOD_GROUPS[0],
  component: COMPONENTS[0],
  requiredUnits: 1,
  hospital: '',
  location: '',
  urgency: 'Medium',
  contact: '',
};

function DonorMatchCard({ match, onSend, sending }) {
  const sent = match.status !== null;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-gray-900">{match.fullName}</p>
          <p className="text-sm text-gray-500">{match.location}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            sent ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {sent ? 'Sent' : 'Not sent'}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-y-1 text-sm mb-4">
        <dt className="text-gray-500">Blood Group</dt>
        <dd className="text-right font-medium text-gray-900">{match.bloodGroup}</dd>
        <dt className="text-gray-500">Distance</dt>
        <dd className="text-right font-medium text-gray-900">
          {match.distanceKm != null ? `${match.distanceKm} km away` : 'Unknown'}
        </dd>
        <dt className="text-gray-500">Contact</dt>
        <dd className="text-right font-medium text-gray-900">
          <a href={`tel:${match.phone}`} className="text-sky-700 hover:underline">
            {match.phone}
          </a>
        </dd>
      </dl>
      <button
        type="button"
        onClick={() => onSend(match)}
        disabled={sent || sending}
        className={`w-full rounded-lg px-3 py-2 text-sm font-semibold transition ${
          sent
            ? 'bg-emerald-50 text-emerald-700 cursor-default'
            : sending
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-sky-600 text-white hover:bg-sky-700'
        }`}
      >
        {sent ? 'Request Sent' : sending ? 'Sending...' : 'Send Request'}
      </button>
    </div>
  );
}

function EmergencyBloodRequestPage() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [maxDistanceKm, setMaxDistanceKm] = useState('');
  const [sendingDonorId, setSendingDonorId] = useState(null);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const { data } = await apiClient.post('/donation-requests', {
        ...form,
        requiredUnits: Number(form.requiredUnits),
      });
      setResult(data);
      setMaxDistanceKm('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search for matching donors.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = async (match) => {
    setSendingDonorId(match.donorId);
    setError('');

    try {
      const { data } = await apiClient.post('/donation-requests/send', {
        donorId: match.donorId,
        requestGroupId: result.requestGroupId,
        bloodGroup: form.bloodGroup,
        component: form.component,
        requiredUnits: Number(form.requiredUnits),
        hospital: form.hospital,
        location: form.location,
        urgency: form.urgency,
        contact: form.contact,
        distanceKm: match.distanceKm,
      });
      setResult((prev) => ({
        ...prev,
        matches: prev.matches.map((m) => (m.donorId === match.donorId ? { ...m, status: data.status } : m)),
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send request to this donor.');
    } finally {
      setSendingDonorId(null);
    }
  };

  const handleNewRequest = () => {
    setForm(emptyForm);
    setResult(null);
    setError('');
    setMaxDistanceKm('');
  };

  const visibleMatches = (result?.matches || []).filter(
    (match) => !maxDistanceKm || match.distanceKm == null || match.distanceKm <= Number(maxDistanceKm)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Emergency Blood Request</h1>
        <p className="mt-2 text-sm text-gray-500">
          Search for nearby, eligible, available donors, then send a request to whichever ones you choose.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!result ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Component</label>
                <select
                  name="component"
                  value={form.component}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  {COMPONENTS.map((component) => (
                    <option key={component} value={component}>
                      {component}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Required Units</label>
                <input
                  name="requiredUnits"
                  type="number"
                  min="1"
                  value={form.requiredUnits}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                <select
                  name="urgency"
                  value={form.urgency}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
              <input
                name="hospital"
                value={form.hospital}
                onChange={handleChange}
                required
                placeholder="Square Hospital"
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
                placeholder="Dhanmondi, Dhaka"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
              <p className="mt-1 text-xs text-gray-400">
                Used to find the nearest donors. Be as specific as possible (area, city).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input
                name="contact"
                value={form.contact}
                onChange={handleChange}
                required
                placeholder="01XXXXXXXXX"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full rounded-lg px-4 py-3 font-semibold transition ${
                submitting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
            >
              {submitting ? 'Finding nearby donors...' : 'Find Donors'}
            </button>
          </form>
        </div>
      ) : (
        <div>
          <div className="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 flex items-center justify-between">
            <span>
              {result.matchedCount} eligible donor{result.matchedCount === 1 ? '' : 's'} found nearby
              {!result.geocoded && ' (location could not be pinpointed — showing all compatible donors regardless of distance)'}.
              Send a request to whichever donor(s) you'd like to reach.
            </span>
            <button
              type="button"
              onClick={handleNewRequest}
              className="ml-4 shrink-0 rounded-lg border border-sky-300 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100"
            >
              New Search
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Matched Donors</h2>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Distance</label>
                <select
                  value={maxDistanceKm}
                  onChange={(event) => setMaxDistanceKm(event.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  {DISTANCE_FILTERS.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {visibleMatches.length === 0 ? (
              <p className="text-sm text-gray-400">
                No eligible, available donors found nearby for this blood group and filter combination.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleMatches.map((match) => (
                  <DonorMatchCard
                    key={match.donorId}
                    match={match}
                    onSend={handleSend}
                    sending={sendingDonorId === match.donorId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmergencyBloodRequestPage;
