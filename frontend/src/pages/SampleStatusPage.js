import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

const STATUS_STEPS = [
  'Booked',
  'Sample Collected',
  'Received in Lab',
  'Under Processing',
  'Result Ready',
  'Approved',
  'Delivered',
];

const STATUS_STYLES = {
  Booked: 'bg-gray-100 text-gray-700',
  'Sample Collected': 'bg-blue-100 text-blue-700',
  'Received in Lab': 'bg-indigo-100 text-indigo-700',
  'Under Processing': 'bg-amber-100 text-amber-700',
  'Result Ready': 'bg-violet-100 text-violet-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Delivered: 'bg-teal-100 text-teal-700',
};

function formatDateTime(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {status}
    </span>
  );
}

function SampleStatusPage() {
  const { user } = useAuth();
  const isStaff = user?.role === ROLES.LAB_STAFF || user?.role === ROLES.ADMIN;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [nextStatus, setNextStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const selectedBooking = useMemo(
    () => bookings.find((b) => b._id === selectedId) || null,
    [bookings, selectedId]
  );

  const loadBookings = useCallback(async (emailOverride) => {
    try {
      setLoading(true);
      const email = emailOverride !== undefined ? emailOverride : emailFilter;
      const url = email ? `/sample-status?email=${encodeURIComponent(email)}` : '/sample-status';
      const { data } = await apiClient.get(url);
      setBookings(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [emailFilter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleSearch = async (event) => {
    event.preventDefault();
    await loadBookings();
  };

  const handleClear = async () => {
    setEmailFilter('');
    await loadBookings('');
  };

  const handleSelect = (booking) => {
    setSelectedId(booking._id);
    setNextStatus(booking.sampleStatus);
    setMessage('');
    setError('');
  };

  const handleUpdateStatus = async () => {
    if (!selectedBooking) return;
    setUpdating(true);
    setMessage('');
    setError('');

    try {
      await apiClient.put(`/sample-status/${selectedBooking._id}`, {
        status: nextStatus,
        updatedBy: 'Lab Staff',
      });
      setMessage('Sample status updated successfully.');
      await loadBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isStaff ? 'Sample status management' : 'Track your sample'}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {isStaff
            ? 'Search any booking and move it through each stage, step by step.'
            : 'Track the progress of your own diagnostic test bookings.'}
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
        <section className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Bookings</h2>
            <span className="text-sm text-gray-500">{bookings.length} total</span>
          </div>

          {isStaff && (
            <form onSubmit={handleSearch} className="flex gap-3 mb-5">
              <input
                type="text"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                placeholder="Filter by patient email"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
              <button
                type="submit"
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Search
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Clear
              </button>
            </form>
          )}

          {loading ? (
            <p className="text-gray-500">Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <p className="text-gray-500">No bookings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-3 pr-4">Patient</th>
                    <th className="py-3 pr-4">Tests</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Booked On</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking._id} className="border-b border-gray-100 align-top">
                      <td className="py-4 pr-4 font-medium text-gray-900">
                        {booking.patientInfo?.fullName}
                      </td>
                      <td className="py-4 pr-4 text-gray-600">
                        {booking.tests?.map((t) => t.testName).join(', ')}
                      </td>
                      <td className="py-4 pr-4">
                        <StatusBadge status={booking.sampleStatus} />
                      </td>
                      <td className="py-4 pr-4 text-gray-600">
                        {formatDateTime(booking.createdAt)}
                      </td>
                      <td className="py-4 pr-4">
                        <button
                          type="button"
                          onClick={() => handleSelect(booking)}
                          className="rounded-lg border border-sky-600 px-3 py-1.5 text-sky-700 hover:bg-sky-50"
                        >
                          {isStaff ? 'View / Update' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {isStaff ? 'Update status' : 'Booking details'}
          </h2>

          {!selectedBooking ? (
            <p className="text-gray-500">
              {isStaff
                ? 'Select a booking from the list to update its status.'
                : 'Select a booking from the list to view its details.'}
            </p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-gray-400 uppercase text-xs mb-1">Patient</p>
                <p className="font-semibold text-gray-900">
                  {selectedBooking.patientInfo?.fullName}
                </p>
              </div>

              <div>
                <p className="text-gray-400 uppercase text-xs mb-1">Current status</p>
                <StatusBadge status={selectedBooking.sampleStatus} />
              </div>

              {isStaff && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Move to status
                    </label>
                    <select
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      {STATUS_STEPS.map((step) => (
                        <option key={step} value={step}>
                          {step}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleUpdateStatus}
                    disabled={updating}
                    className={`w-full rounded-lg px-4 py-2 font-semibold text-white transition ${
                      updating ? 'bg-gray-300 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700'
                    }`}
                  >
                    {updating ? 'Updating...' : 'Update status'}
                  </button>
                </>
              )}

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Status history</p>
                {selectedBooking.statusHistory?.length ? (
                  <ul className="space-y-2 text-sm">
                    {selectedBooking.statusHistory.map((h, idx) => (
                      <li key={idx} className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="text-gray-700">{h.status}</span>
                        <span className="text-gray-400">{formatDateTime(h.updatedAt)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">No history yet.</p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default SampleStatusPage;