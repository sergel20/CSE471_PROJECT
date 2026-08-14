import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : 'N/A';
}

function FlagBadge({ flag }) {
  const styles = {
    High: 'bg-red-100 text-red-700',
    Low: 'bg-blue-100 text-blue-700',
    Normal: 'bg-emerald-100 text-emerald-700',
    Abnormal: 'bg-violet-100 text-violet-700',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[flag] || 'bg-gray-100 text-gray-700'}`}>{flag}</span>;
}

function ReportApprovalPage() {
  const { user } = useAuth();
  const isDoctor = user?.role === ROLES.DOCTOR;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(isDoctor ? '/report-approval/pending' : '/reports/me');
      setItems(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [isDoctor]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const review = async (resultId, decision) => {
    let rejectionReason;
    if (decision === 'reject') {
      rejectionReason = window.prompt('Reason for rejecting this result?');
      if (rejectionReason === null) return;
    }

    setActingId(resultId);
    setError('');
    setMessage('');
    try {
      const { data } = await apiClient.put(`/report-approval/${resultId}`, {
        decision,
        rejectionReason,
      });
      setMessage(data.message);
      await loadItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to review result.');
    } finally {
      setActingId('');
    }
  };

  const download = async (result) => {
    setActingId(result._id);
    setError('');
    try {
      const response = await apiClient.get(`/reports/${result._id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${result.sampleId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download the approved report.');
    } finally {
      setActingId('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-gray-900">{isDoctor ? 'Results awaiting approval' : 'My approved reports'}</h1>
        <p className="mt-2 text-sm text-gray-500">
          {isDoctor
            ? 'Approve completed lab results or return them to the lab for correction.'
            : 'Reports appear here automatically after a doctor approves the lab result.'}
        </p>
      </div>

      {(error || message) && (
        <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-gray-500">
          {isDoctor ? 'No results are waiting for approval.' : 'You do not have any approved reports yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4">Sample ID</th>
                <th className="py-3 pr-4">Patient</th>
                <th className="py-3 pr-4">Test</th>
                <th className="py-3 pr-4">Result</th>
                <th className="py-3 pr-4">Flag</th>
                <th className="py-3 pr-4">Date</th>
                <th className="py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((result) => (
                <tr key={result._id} className="border-b border-gray-100">
                  <td className="py-4 pr-4 font-mono text-xs font-semibold">{result.sampleId}</td>
                  <td className="py-4 pr-4">{result.booking?.patientInfo?.fullName || user?.name}</td>
                  <td className="py-4 pr-4 font-medium">{result.testName}</td>
                  <td className="py-4 pr-4">{result.observedValue} {result.unit}</td>
                  <td className="py-4 pr-4"><FlagBadge flag={result.flag} /></td>
                  <td className="py-4 pr-4 text-gray-500">{formatDateTime(isDoctor ? result.createdAt : result.approvedAt)}</td>
                  <td className="py-4">
                    {isDoctor ? (
                      <div className="flex gap-2">
                        <button type="button" disabled={actingId === result._id} onClick={() => review(result._id, 'approve')} className="rounded-lg border border-emerald-600 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Approve</button>
                        <button type="button" disabled={actingId === result._id} onClick={() => review(result._id, 'reject')} className="rounded-lg border border-red-600 px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button>
                      </div>
                    ) : (
                      <button type="button" disabled={actingId === result._id} onClick={() => download(result)} className="rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white hover:bg-sky-700 disabled:bg-gray-300">
                        {actingId === result._id ? 'Preparing...' : 'Download PDF'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ReportApprovalPage;
