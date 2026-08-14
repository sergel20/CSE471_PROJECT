import { useEffect, useMemo, useState } from 'react';
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
];

function SampleStatusPage() {
  const { user } = useAuth();
  const isPatient = user?.role === ROLES.PATIENT;
  const [bookings, setBookings] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await apiClient.get('/sample-status');
        setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load sample tracking.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const rows = useMemo(() => bookings.flatMap((booking) =>
    (booking.tests || []).map((sample) => ({ ...sample, booking }))
  ), [bookings]);
  const selected = rows.find((row) => `${row.booking._id}:${row._id}` === selectedKey);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-gray-900">{isPatient ? 'Track my samples' : 'Released sample queue'}</h1>
        <p className="mt-2 text-sm text-gray-500">
          {isPatient ? 'Sample progress is read-only and is updated by the responsible staff role.' : 'Only samples released by the admin are visible to lab staff.'}
        </p>
      </div>

      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? <p className="text-gray-500">Loading tracking information...</p> : bookings.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-gray-500">No samples are available yet.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500"><th className="py-3 pr-4">Sample ID</th><th className="py-3 pr-4">Test</th><th className="py-3 pr-4">Patient</th><th className="py-3 pr-4">Status</th><th className="py-3">Details</th></tr></thead>
              <tbody>{rows.map((row) => {
                const key = `${row.booking._id}:${row._id}`;
                return (
                  <tr key={key} className="border-b border-gray-100">
                    <td className="py-4 pr-4 font-mono text-xs font-semibold">{row.sampleId || 'Awaiting admin confirmation'}</td>
                    <td className="py-4 pr-4">{row.testName}</td>
                    <td className="py-4 pr-4">{row.booking.patientInfo?.fullName}</td>
                    <td className="py-4 pr-4 font-medium">{row.sampleStatus || row.booking.bookingStatus}</td>
                    <td className="py-4"><button type="button" onClick={() => setSelectedKey(key)} className="text-sky-700 hover:underline">View track</button></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </section>

          <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Status track</h2>
            {!selected ? <p className="text-gray-500">Select a sample to view its progress.</p> : !selected.sampleId ? (
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">The payment confirmation request is waiting for admin approval. Sample IDs will be generated after confirmation.</div>
            ) : (
              <div>
                <p className="font-mono text-sm font-semibold text-sky-700 mb-1">{selected.sampleId}</p>
                <p className="text-sm text-gray-600 mb-5">{selected.testName} · {selected.sampleType}</p>
                <ol className="space-y-3">
                  {STATUS_STEPS.map((step) => {
                    const currentIndex = STATUS_STEPS.indexOf(selected.sampleStatus);
                    const stepIndex = STATUS_STEPS.indexOf(step);
                    const reached = stepIndex <= currentIndex;
                    const event = [...(selected.statusHistory || [])].reverse().find((item) => item.status === step);
                    return (
                      <li key={step} className="flex gap-3">
                        <span className={`mt-0.5 h-5 w-5 rounded-full border-2 ${reached ? 'border-emerald-600 bg-emerald-500' : 'border-gray-300 bg-white'}`} />
                        <div><p className={reached ? 'font-semibold text-gray-900' : 'text-gray-400'}>{step}</p>{event && <p className="text-xs text-gray-400">{new Date(event.updatedAt).toLocaleString()} · {event.updatedBy}</p>}</div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default SampleStatusPage;
