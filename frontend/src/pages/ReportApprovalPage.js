import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

function formatDateTime(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

function FlagBadge({ flag }) {
  const styles = {
    High: 'bg-red-100 text-red-700',
    Low: 'bg-blue-100 text-blue-700',
    Normal: 'bg-emerald-100 text-emerald-700',
    Abnormal: 'bg-violet-100 text-violet-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[flag] || 'bg-gray-100 text-gray-700'}`}>
      {flag}
    </span>
  );
}

function ReportApprovalPage() {
  const { user } = useAuth();
  const isApprover = user?.role === ROLES.DOCTOR || user?.role === ROLES.ADMIN;
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [actingId, setActingId] = useState(null);

  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  const loadPending = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/report-approval/pending');
      setPending(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isApprover) {
      loadPending();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApprover]);

  const handleApprove = async (resultId) => {
    setActingId(resultId);
    setMessage('');
    setError('');
    try {
      await apiClient.put(`/report-approval/${resultId}`, {
        decision: 'approve',
        approvedBy: 'Dr. Reviewer',
      });
      setMessage('Report approved. The patient can now view/download it.');
      await loadPending();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve report.');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (resultId) => {
    const reason = window.prompt('Reason for rejecting this report?');
    if (reason === null) return; // cancelled

    setActingId(resultId);
    setMessage('');
    setError('');
    try {
      await apiClient.put(`/report-approval/${resultId}`, {
        decision: 'reject',
        rejectionReason: reason || 'Not specified',
      });
      setMessage('Report rejected.');
      await loadPending();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject report.');
    } finally {
      setActingId(null);
    }
  };

  const handleLookup = async (event) => {
    event.preventDefault();
    if (!lookupId.trim()) return;

    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const { data } = await apiClient.get(`/report-approval/${lookupId.trim()}`);
      setLookupResult(data);
    } catch (err) {
      setLookupError(err.response?.data?.message || 'Report not found.');
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isApprover ? 'Doctor report approval' : 'My Reports'}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {isApprover
            ? 'Review entered results and approve or reject them. Patients can only view or download a report once it has been approved.'
            : 'Look up a report by ID to view or download it. Reports are only available once a doctor has approved them.'}
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
        {isApprover && (
        <section className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Pending approval</h2>
            <span className="text-sm text-gray-500">{pending.length} waiting</span>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : pending.length === 0 ? (
            <p className="text-gray-500">No reports waiting for approval right now.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-3 pr-4">Sample ID</th>
                    <th className="py-3 pr-4">Test</th>
                    <th className="py-3 pr-4">Value</th>
                    <th className="py-3 pr-4">Flag</th>
                    <th className="py-3 pr-4">Entered</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((result) => (
                    <tr key={result._id} className="border-b border-gray-100 align-top">
                      <td className="py-4 pr-4 text-gray-600">{result.sampleId}</td>
                      <td className="py-4 pr-4 font-medium text-gray-900">{result.testName}</td>
                      <td className="py-4 pr-4">
                        {result.observedValue} {result.unit}
                      </td>
                      <td className="py-4 pr-4">
                        <FlagBadge flag={result.flag} />
                      </td>
                      <td className="py-4 pr-4 text-gray-600">{formatDateTime(result.createdAt)}</td>
                      <td className="py-4 pr-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={actingId === result._id}
                            onClick={() => handleApprove(result._id)}
                            className="rounded-lg border border-emerald-600 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={actingId === result._id}
                            onClick={() => handleReject(result._id)}
                            className="rounded-lg border border-red-600 px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        )}

        <section className={`${isApprover ? 'lg:col-span-2' : 'lg:col-span-5 max-w-xl mx-auto w-full'} bg-white rounded-2xl border border-gray-200 shadow-sm p-6`}>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {isApprover ? 'Patient report view' : 'View / download a report'}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {isApprover
              ? 'Enter a result ID to check if the patient can view/download it yet.'
              : 'Enter your report ID to view it. It will only appear once a doctor has approved it.'}
          </p>

          <form onSubmit={handleLookup} className="flex gap-3 mb-5">
            <input
              type="text"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="Result ID"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              View
            </button>
          </form>

          {lookupLoading && <p className="text-gray-500">Checking...</p>}

          {lookupError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {lookupError}
            </div>
          )}

          {lookupResult && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Test</span>
                <span className="font-semibold text-gray-900">{lookupResult.testName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Value</span>
                <span className="font-semibold text-gray-900">
                  {lookupResult.observedValue} {lookupResult.unit}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Flag</span>
                <FlagBadge flag={lookupResult.flag} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Approved by</span>
                <span className="font-semibold text-gray-900">{lookupResult.approvedBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Approved on</span>
                <span className="text-gray-700">{formatDateTime(lookupResult.approvedAt)}</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ReportApprovalPage;