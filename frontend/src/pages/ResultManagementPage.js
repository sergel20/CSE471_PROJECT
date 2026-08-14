import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';

const emptyForm = {
  sampleId: '',
  observedValue: '',
  unit: '',
  referenceMin: '',
  referenceMax: '',
};

function calculateFlag(value, min, max) {
  if (![value, min, max].every(Number.isFinite) || min > max) return 'Abnormal';
  if (value > max) return 'High';
  if (value < min) return 'Low';
  return 'Normal';
}

function ResultManagementPage() {
  const [samples, setSamples] = useState([]);
  const [results, setResults] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [queueResponse, resultsResponse] = await Promise.all([
        apiClient.get('/sample-status'),
        apiClient.get('/results'),
      ]);
      const flattened = (queueResponse.data || []).flatMap((booking) =>
        (booking.tests || []).map((sample) => ({
          ...sample,
          bookingId: booking._id,
          patientInfo: booking.patientInfo,
          preferredDate: booking.preferredDate,
        }))
      );
      setSamples(flattened);
      setResults(Array.isArray(resultsResponse.data) ? resultsResponse.data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load the lab sample queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedSample = useMemo(
    () => samples.find((sample) => sample.sampleId === form.sampleId),
    [samples, form.sampleId]
  );

  const previewFlag = calculateFlag(
    Number(form.observedValue),
    Number(form.referenceMin),
    Number(form.referenceMax)
  );

  const selectSample = (sampleId) => {
    const sample = samples.find((item) => item.sampleId === sampleId);
    setEditingId('');
    setForm(sample ? {
      sampleId: sample.sampleId,
      observedValue: '',
      unit: sample.unit,
      referenceMin: sample.referenceRange?.min ?? '',
      referenceMax: sample.referenceRange?.max ?? '',
    } : emptyForm);
  };

  const editResult = (result) => {
    setEditingId(result._id);
    setForm({
      sampleId: result.sampleId,
      observedValue: result.observedValue,
      unit: result.unit,
      referenceMin: result.referenceRange?.min ?? '',
      referenceMax: result.referenceRange?.max ?? '',
    });
    setMessage('');
    setError('');
  };

  const resetForm = () => {
    setEditingId('');
    setForm(emptyForm);
  };

  const submitResult = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    const payload = {
      sampleId: form.sampleId,
      observedValue: Number(form.observedValue),
      unit: form.unit.trim(),
      referenceRange: {
        min: Number(form.referenceMin),
        max: Number(form.referenceMax),
      },
    };

    try {
      if (editingId) {
        await apiClient.put(`/results?id=${editingId}`, payload);
        setMessage('Corrected result resubmitted for doctor approval.');
      } else {
        await apiClient.post('/results', payload);
        setMessage('Result saved. The sample is now Result Ready and has been sent to the doctor.');
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save result.');
    } finally {
      setSaving(false);
    }
  };

  const deleteResult = async (resultId) => {
    if (!window.confirm('Delete this result and return the sample to Under Processing?')) return;
    try {
      await apiClient.delete(`/results?id=${resultId}`);
      setMessage('Result deleted and sample returned to the lab queue.');
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete result.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-gray-900">Lab result entry</h1>
        <p className="mt-2 text-sm text-gray-500">
          Result entry unlocks after the admin advances a released sample to Under Processing.
        </p>
      </div>

      {(error || message) && (
        <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-5">{editingId ? 'Correct result' : 'Enter result'}</h2>
          {loading ? (
            <p className="text-gray-500">Loading samples...</p>
          ) : (
            <form onSubmit={submitResult} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sample ID</label>
                {editingId ? (
                  <input value={form.sampleId} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 font-mono text-sm" />
                ) : (
                  <select required value={form.sampleId} onChange={(event) => selectSample(event.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2">
                    <option value="">Select a Sample ID</option>
                    {samples.map((sample) => (
                      <option
                        key={sample.sampleId}
                        value={sample.sampleId}
                        disabled={sample.sampleStatus !== 'Under Processing'}
                      >
                        {sample.sampleId} — {sample.testName} — {sample.patientInfo?.fullName} — {sample.sampleStatus}
                      </option>
                    ))}
                  </select>
                )}
                {!editingId && samples.length > 0 && !samples.some((sample) => sample.sampleStatus === 'Under Processing') && (
                  <p className="mt-2 text-xs text-amber-700">
                    Released samples are listed, but the admin must move one to Under Processing before result entry.
                  </p>
                )}
              </div>

              {(selectedSample || editingId) && (
                <div className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800">
                  {selectedSample ? `${selectedSample.testName} · ${selectedSample.sampleType} · ${selectedSample.sampleStatus}` : 'Editing an existing submitted result'}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observed value</label>
                <input type="number" step="any" required value={form.observedValue} onChange={(event) => setForm((prev) => ({ ...prev, observedValue: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input required value={form.unit} onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference min</label>
                  <input type="number" step="any" required value={form.referenceMin} onChange={(event) => setForm((prev) => ({ ...prev, referenceMin: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference max</label>
                  <input type="number" step="any" required value={form.referenceMax} onChange={(event) => setForm((prev) => ({ ...prev, referenceMax: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-2" />
                </div>
              </div>
              <p className="text-sm text-gray-600">Automatic flag: <strong>{previewFlag}</strong></p>
              <div className="flex gap-3">
                {editingId && <button type="button" onClick={resetForm} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700">Cancel</button>}
                <button type="submit" disabled={saving || !form.sampleId} className="flex-1 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700 disabled:bg-gray-300">
                  {saving ? 'Saving...' : editingId ? 'Resubmit Result' : 'Save Result'}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex justify-between mb-4"><h2 className="text-xl font-semibold">Submitted results</h2><span className="text-sm text-gray-500">{results.length} total</span></div>
          {results.length === 0 ? <p className="text-gray-500">No results entered yet.</p> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500"><th className="py-2 pr-3">Sample</th><th className="py-2 pr-3">Test</th><th className="py-2 pr-3">Result</th><th className="py-2 pr-3">Approval</th><th className="py-2">Actions</th></tr></thead>
                <tbody>{results.map((result) => (
                  <tr key={result._id} className="border-b border-gray-100">
                    <td className="py-3 pr-3 font-mono text-xs">{result.sampleId}</td>
                    <td className="py-3 pr-3">{result.testName}</td>
                    <td className="py-3 pr-3">{result.observedValue} {result.unit} <span className="text-xs text-gray-500">({result.flag})</span></td>
                    <td className="py-3 pr-3">{result.approvalStatus}</td>
                    <td className="py-3"><div className="flex gap-2">
                      {result.approvalStatus !== 'Approved' && <button type="button" onClick={() => editResult(result)} className="text-sky-700 hover:underline">Edit</button>}
                      {result.approvalStatus !== 'Approved' && <button type="button" onClick={() => deleteResult(result._id)} className="text-red-700 hover:underline">Delete</button>}
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ResultManagementPage;
