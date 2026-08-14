import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';

const NEXT_STATUS = {
  Booked: 'Sample Collected',
  'Sample Collected': 'Received in Lab',
  'Received in Lab': 'Under Processing',
};

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'N/A';
}

function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadBookings = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const { data } = await apiClient.get('/bookings/admin');
      setBookings(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load booking requests.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    const interval = window.setInterval(() => loadBookings(true), 10000);
    return () => window.clearInterval(interval);
  }, [loadBookings]);

  const confirmBooking = async (bookingId) => {
    setActing(bookingId);
    setError('');
    setMessage('');
    try {
      const { data } = await apiClient.put(`/bookings/${bookingId}/confirm`);
      setMessage(data.message);
      await loadBookings(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm booking.');
    } finally {
      setActing('');
    }
  };

  const advanceSample = async (bookingId, sample, selectedStatus) => {
    const next = NEXT_STATUS[sample.sampleStatus];
    if (!next || selectedStatus !== next) return;
    const actionId = `${bookingId}:${sample.sampleId}`;
    setActing(actionId);
    setError('');
    setMessage('');
    try {
      const { data } = await apiClient.put(`/sample-status/${bookingId}/${sample.sampleId}`, {
        status: selectedStatus,
      });
      setMessage(data.message);
      await loadBookings(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update sample status.');
    } finally {
      setActing('');
    }
  };

  const pendingCount = bookings.filter((booking) => booking.bookingStatus === 'Pending Confirmation').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Booking confirmations</h1>
          <p className="mt-2 text-sm text-gray-500">
            Confirm payment requests, generate Sample IDs, and release samples to the lab.
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
          {pendingCount} pending
        </span>
      </div>

      {(error || message) && (
        <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading booking requests...</p>
      ) : bookings.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-gray-500">No booking requests yet.</p>
      ) : (
        <div className="space-y-5">
          {bookings.map((booking) => (
            <section key={booking._id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{booking.patientInfo?.fullName}</h2>
                  <p className="text-sm text-gray-500">{booking.patientInfo?.email} · {booking.patientInfo?.phone}</p>
                  <p className="text-xs text-gray-400 mt-1">Requested {formatDate(booking.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sky-700">৳{booking.totalPrice}</p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{booking.bookingStatus}</p>
                </div>
              </div>

              {booking.bookingStatus === 'Pending Confirmation' ? (
                <button
                  type="button"
                  onClick={() => confirmBooking(booking._id)}
                  disabled={acting === booking._id}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-300"
                >
                  {acting === booking._id ? 'Confirming...' : 'Confirm Payment & Generate Sample IDs'}
                </button>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="py-2 pr-4">Sample ID</th>
                        <th className="py-2 pr-4">Test</th>
                        <th className="py-2 pr-4">Sample</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2">Update status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {booking.tests?.map((sample) => {
                        const next = NEXT_STATUS[sample.sampleStatus];
                        const actionId = `${booking._id}:${sample.sampleId}`;
                        return (
                          <tr key={sample._id} className="border-b border-gray-100">
                            <td className="py-3 pr-4 font-mono text-xs font-semibold">{sample.sampleId}</td>
                            <td className="py-3 pr-4">{sample.testName}</td>
                            <td className="py-3 pr-4 text-gray-600">{sample.sampleType}</td>
                            <td className="py-3 pr-4 font-medium">{sample.sampleStatus}</td>
                            <td className="py-3">
                              <select
                                value={sample.sampleStatus}
                                onChange={(event) => advanceSample(booking._id, sample, event.target.value)}
                                disabled={!next || acting === actionId}
                                aria-label={`Update status for ${sample.sampleId}`}
                                className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-sm text-sky-800 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500"
                              >
                                <option value={sample.sampleStatus}>{acting === actionId ? 'Updating...' : sample.sampleStatus}</option>
                                {next && <option value={next}>{next}</option>}
                              </select>
                              {!next && <p className="mt-1 text-xs text-gray-400">Next step belongs to lab/doctor</p>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminBookingsPage;
