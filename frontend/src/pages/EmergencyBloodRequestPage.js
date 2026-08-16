import { useEffect, useState } from 'react';
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
const STATUS_FILTERS = ['All', 'Pending', 'Accepted', 'Rejected'];

const emptyForm = {
  bloodGroup: BLOOD_GROUPS[0],
  component: COMPONENTS[0],
  requiredUnits: 1,
  hospital: '',
  location: '',
  urgency: 'Medium',
  contact: '',
};

const STATUS_STYLES = {
  Pending: 'bg-amber-100 text-amber-700',
  Accepted: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
};

function DonorMatchCard({ match }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-gray-900">{match.fullName}</p>
          <p className="text-sm text-gray-500">{match.location}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            STATUS_STYLES[match.status] || 'bg-gray-100 text-gray-600'
          }`}
        >
          {match.status}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
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
    </div>
  );
}

function EmergencyBloodRequestPage() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [maxDistanceKm, setMaxDistanceKm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

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
      setStatusFilter('All');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit emergency blood request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Re-fetch the matched-donor list whenever a filter changes, so donors can be narrowed
  // by distance or response status without re-submitting the request.
  useEffect(() => {
    if (!result?.requestGroupId) return;

    const fetchMatches = async () => {
      setRefreshing(true);
      try {
        const params = {};
        if (maxDistanceKm) params.maxDistanceKm = maxDistanceKm;
        if (statusFilter !== 'All') params.status = statusFilter;
        const { data } = await apiClient.get(`/donation-requests/group/${result.requestGroupId}`, { params });
        setResult((prev) => ({ ...prev, matchedCount: data.matchedCount, matches: data.matches }));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to refresh matched donors.');
      } finally {
        setRefreshing(false);
      }
    };
    fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDistanceKm, statusFilter]);

  const handleNewRequest = () => {
    setForm(emptyForm);
    setResult(null);
    setError('');
    setMaxDistanceKm('');
    setStatusFilter('All');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Emergency Blood Request</h1>
        <p className="mt-2 text-sm text-gray-500">
          Submit an urgent blood request and the system will automatically match nearby, eligible,
          available donors — closest first.
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
              {submitting ? 'Finding nearby donors...' : 'Submit Request & Find Donors'}
            </button>
          </form>
        </div>
      ) : (
        <div>
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between">
            <span>
              Request submitted. {result.matchedCount} matching donor{result.matchedCount === 1 ? '' : 's'} notified
              {!result.geocoded && ' (location could not be pinpointed — showing all compatible donors regardless of distance)'}.
            </span>
            <button
              type="button"
              onClick={handleNewRequest}
              className="ml-4 shrink-0 rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              New Request
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Matched Donors {refreshing && <span className="text-sm font-normal text-gray-400">(refreshing...)</span>}
              </h2>
              <div className="flex flex-wrap gap-3">
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
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  >
                    {STATUS_FILTERS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {result.matches.length === 0 ? (
              <p className="text-sm text-gray-400">
                No eligible, available donors found nearby for this blood group and filter combination.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.matches.map((match) => (
                  <DonorMatchCard key={match.requestId} match={match} />
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
