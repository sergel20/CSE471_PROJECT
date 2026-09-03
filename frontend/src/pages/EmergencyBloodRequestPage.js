import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS = ['Whole Blood', 'Red Blood Cells', 'Plasma', 'Platelets', 'Cryoprecipitate'];
const PRIORITIES = ['Critical', 'High', 'Normal'];
const NEXT_STATUS = {
  Submitted: 'Under Verification',
  'Under Verification': 'In Progress',
  'In Progress': 'Blood Arranged',
  'Blood Arranged': 'Completed',
};

const emptyForm = {
  bloodGroup: 'A+',
  componentType: 'Whole Blood',
  requiredUnits: 1,
  hospitalName: '',
  location: '',
  contactNumber: '',
  urgencyLevel: 'Normal',
  requiredBy: '',
  additionalNotes: '',
};

const badgeClass = {
  Critical: 'bg-red-100 text-red-700',
  High: 'bg-amber-100 text-amber-700',
  Normal: 'bg-sky-100 text-sky-700',
  Submitted: 'bg-gray-100 text-gray-700',
  'Under Verification': 'bg-violet-100 text-violet-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Blood Arranged': 'bg-emerald-100 text-emerald-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

function Badge({ value }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass[value] || 'bg-gray-100 text-gray-700'}`}>{value}</span>;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'Not available';
}

function EmergencyBloodRequestPage() {
  const { user } = useAuth();
  const isManager = user?.role === ROLES.HOSPITAL_STAFF || user?.role === ROLES.ADMIN;
  const canCreate = user?.role === ROLES.PATIENT || user?.role === ROLES.HOSPITAL_STAFF;
  const [form, setForm] = useState(emptyForm);
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [progressNote, setProgressNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/emergency-blood-requests/history');
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load blood request history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const clearAlerts = () => {
    setMessage('');
    setError('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const openRequest = async (id) => {
    clearAlerts();
    try {
      const { data } = await apiClient.get(`/emergency-blood-requests/${id}`);
      setSelected(data);
      setProgressNote(data.latestProgressNote || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load the blood request.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearAlerts();
    setWorking(true);
    try {
      const { data } = await apiClient.post('/emergency-blood-requests', {
        ...form,
        requiredUnits: Number(form.requiredUnits),
        requiredBy: new Date(form.requiredBy).toISOString(),
      });
      setForm(emptyForm);
      setSelected(data.request);
      setMessage(data.message);
      await loadHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit the blood request.');
    } finally {
      setWorking(false);
    }
  };

  const changeStatus = async (status) => {
    clearAlerts();
    setWorking(true);
    try {
      const { data } = await apiClient.patch(`/emergency-blood-requests/${selected._id}/status`, { status });
      setMessage(data.message);
      await Promise.all([loadHistory(), openRequest(selected._id)]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update request status.');
    } finally {
      setWorking(false);
    }
  };

  const saveProgressNote = async (event) => {
    event.preventDefault();
    clearAlerts();
    setWorking(true);
    try {
      const { data } = await apiClient.patch(`/emergency-blood-requests/${selected._id}/progress-note`, { note: progressNote });
      setMessage(data.message);
      await Promise.all([loadHistory(), openRequest(selected._id)]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save the progress note.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Blood Request Tracking &amp; Emergency Coordination</h1>
        <p className="mt-2 text-sm text-gray-500">Create urgent blood requests and follow each request from submission through completion.</p>
      </div>

      {message && <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className={`grid grid-cols-1 ${canCreate ? 'lg:grid-cols-2' : ''} gap-6 items-start`}>
        {canCreate && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-5">Create Emergency Request</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-sm font-medium text-gray-700">Blood Group
                  <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                    {BLOOD_GROUPS.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">Component Type
                  <select name="componentType" value={form.componentType} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                    {COMPONENTS.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-sm font-medium text-gray-700">Required Units
                  <input required min="1" step="1" type="number" name="requiredUnits" value={form.requiredUnits} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                </label>
                <label className="text-sm font-medium text-gray-700">Priority
                  <select name="urgencyLevel" value={form.urgencyLevel} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                    {PRIORITIES.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-medium text-gray-700">Hospital Name
                <input required name="hospitalName" value={form.hospitalName} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-gray-700">Hospital / Location
                <input required name="location" value={form.location} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-sm font-medium text-gray-700">Contact Number
                  <input required type="tel" name="contactNumber" value={form.contactNumber} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                </label>
                <label className="text-sm font-medium text-gray-700">Required By
                  <input required type="datetime-local" name="requiredBy" value={form.requiredBy} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                </label>
              </div>
              <label className="block text-sm font-medium text-gray-700">Additional Notes (optional)
                <textarea maxLength="1000" rows="3" name="additionalNotes" value={form.additionalNotes} onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <button disabled={working} className="w-full rounded-lg bg-sky-600 px-4 py-3 font-semibold text-white hover:bg-sky-700 disabled:bg-gray-300">{working ? 'Submitting...' : 'Submit Blood Request'}</button>
            </form>
          </section>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-gray-900">Request History</h2>
            <button type="button" onClick={loadHistory} className="text-sm font-medium text-sky-700 hover:underline">Refresh</button>
          </div>
          {loading ? <p className="text-sm text-gray-500">Loading requests...</p> : requests.length === 0 ? <p className="text-sm text-gray-500">No blood requests found.</p> : (
            <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
              {requests.map((request) => (
                <button key={request._id} type="button" onClick={() => openRequest(request._id)} className="w-full rounded-xl border border-gray-200 p-4 text-left hover:border-sky-300 hover:bg-sky-50">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="font-semibold text-gray-900">{request.bloodGroup} · {request.requiredUnits} unit{request.requiredUnits === 1 ? '' : 's'}</p><p className="text-sm text-gray-500">{request.hospitalName}</p></div>
                    <div className="flex gap-2"><Badge value={request.urgencyLevel} /><Badge value={request.requestStatus} /></div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">Requested {formatDate(request.createdAt)}</p>
                  <p className="mt-1 text-sm text-gray-600">Latest update: {request.latestProgressNote || 'No progress update yet'}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selected && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
            <div><h2 className="text-xl font-semibold text-gray-900">Request Details</h2><p className="text-xs text-gray-400 mt-1">ID: {selected._id}</p></div>
            <div className="flex gap-2"><Badge value={selected.urgencyLevel} /><Badge value={selected.requestStatus} /></div>
          </div>
          <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div><dt className="text-gray-500">Blood</dt><dd className="font-medium text-gray-900">{selected.bloodGroup} · {selected.componentType}</dd></div>
            <div><dt className="text-gray-500">Required Units</dt><dd className="font-medium text-gray-900">{selected.requiredUnits}</dd></div>
            <div><dt className="text-gray-500">Required By</dt><dd className="font-medium text-gray-900">{formatDate(selected.requiredBy)}</dd></div>
            <div><dt className="text-gray-500">Contact</dt><dd className="font-medium text-gray-900">{selected.contactNumber}</dd></div>
            <div className="sm:col-span-2"><dt className="text-gray-500">Hospital</dt><dd className="font-medium text-gray-900">{selected.hospitalName}, {selected.location}</dd></div>
            <div className="sm:col-span-2"><dt className="text-gray-500">Additional Notes</dt><dd className="font-medium text-gray-900">{selected.additionalNotes || 'None'}</dd></div>
          </dl>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Status History</h3>
              <ol className="space-y-3">
                {(selected.statusHistory || []).map((entry, index) => <li key={`${entry.updatedAt}-${index}`} className="border-l-2 border-sky-300 pl-3 text-sm"><p className="font-medium text-gray-800">{entry.fromStatus ? `${entry.fromStatus} → ${entry.toStatus}` : entry.toStatus}</p><p className="text-xs text-gray-500">{formatDate(entry.updatedAt)} · {entry.updatedByRole}</p></li>)}
              </ol>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Progress Updates</h3>
              {(selected.progressUpdates || []).length === 0 ? <p className="text-sm text-gray-500">No progress updates yet.</p> : (
                <ol className="space-y-3">{[...selected.progressUpdates].reverse().map((entry, index) => <li key={`${entry.updatedAt}-${index}`} className="rounded-lg bg-gray-50 p-3 text-sm"><p className="text-gray-800">{entry.note}</p><p className="mt-1 text-xs text-gray-500">{entry.status} · {formatDate(entry.updatedAt)} · {entry.updatedByRole}</p></li>)}</ol>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-5">
            {isManager && NEXT_STATUS[selected.requestStatus] && <button type="button" disabled={working} onClick={() => changeStatus(NEXT_STATUS[selected.requestStatus])} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-300">Move to {NEXT_STATUS[selected.requestStatus]}</button>}
            {user?.role === ROLES.PATIENT && selected.requestStatus === 'Submitted' && <button type="button" disabled={working} onClick={() => changeStatus('Cancelled')} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-gray-300">Cancel Request</button>}
          </div>

          {isManager && !['Completed', 'Cancelled'].includes(selected.requestStatus) && (
            <form onSubmit={saveProgressNote} className="mt-5 max-w-2xl">
              <label className="block text-sm font-medium text-gray-700">Progress Note
                <textarea required maxLength="500" rows="3" value={progressNote} onChange={(event) => setProgressNote(event.target.value)} placeholder="e.g. Blood arrangement in progress" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <button disabled={working} className="mt-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-gray-300">Save Progress Note</button>
            </form>
          )}
        </section>
      )}
    </main>
  );
}

export default EmergencyBloodRequestPage;
