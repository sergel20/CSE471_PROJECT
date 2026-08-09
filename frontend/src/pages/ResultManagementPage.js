import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';

const emptyForm = {
  sampleId: '',
  testName: '',
  observedValue: '',
  unit: '',
  referenceMin: '',
  referenceMax: '',
};

const emptyFilters = {
  date: '',
  testName: '',
  flag: '',
  sampleId: '',
};

const FLAG_OPTIONS = ['Normal', 'High', 'Low', 'Abnormal'];

function calculateFlag(value, min, max) {
  if (![value, min, max].every((entry) => Number.isFinite(entry)) || min > max) {
    return 'Abnormal';
  }

  if (value > max) return 'High';
  if (value < min) return 'Low';
  return 'Normal';
}

function formatDateTime(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

function ResultManagementPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState(emptyFilters);

  const selectedResult = useMemo(
    () => results.find((result) => result._id === editingId) || null,
    [results, editingId]
  );

  const previewFlag = useMemo(() => {
    const value = Number(form.observedValue);
    const min = Number(form.referenceMin);
    const max = Number(form.referenceMax);
    return calculateFlag(value, min, max);
  }, [form.observedValue, form.referenceMin, form.referenceMax]);

  const loadResults = useCallback(async (filterOverrides = {}) => {
    try {
      setLoading(true);
      const activeFilters = { ...filters, ...filterOverrides };
      const params = new URLSearchParams();

      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      const url = params.toString() ? `/results?${params.toString()}` : '/results';
      const { data } = await apiClient.get(url);
      setResults(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load results.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  useEffect(() => {
    if (!selectedResult) return;

    setForm({
      sampleId: selectedResult.sampleId || '',
      testName: selectedResult.testName || '',
      observedValue: selectedResult.observedValue ?? '',
      unit: selectedResult.unit || '',
      referenceMin: selectedResult.referenceRange?.min ?? '',
      referenceMax: selectedResult.referenceRange?.max ?? '',
    });
  }, [selectedResult]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = async (event) => {
    event.preventDefault();
    await loadResults();
  };

  const handleClearFilters = async () => {
    const cleared = emptyFilters;
    setFilters(cleared);
    await loadResults(cleared);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const payload = {
      sampleId: form.sampleId.trim(),
      testName: form.testName.trim(),
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
        setMessage('Result updated successfully.');
      } else {
        await apiClient.post('/results', payload);
        setMessage('Result saved successfully.');
      }

      resetForm();
      await loadResults();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save result.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (result) => {
    setEditingId(result._id);
  };

  const handleDelete = async (resultId) => {
    const confirmed = window.confirm('Delete this result entry?');
    if (!confirmed) return;

    try {
      setMessage('');
      setError('');
      await apiClient.delete(`/results?id=${resultId}`);
      if (editingId === resultId) {
        resetForm();
      }
      setMessage('Result deleted successfully.');
      await loadResults();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete result.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Result entry</h1>
        <p className="mt-2 text-sm text-gray-500">
          Enter a result value with its unit and reference range. The system flags it as Normal,
          High, Low, or Abnormal automatically.
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

      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-400 uppercase text-xs mb-1">Sample ID</p>
            <p className="font-semibold text-gray-900">{form.sampleId || 'Pending entry'}</p>
          </div>
          <div>
            <p className="text-gray-400 uppercase text-xs mb-1">Test</p>
            <p className="font-semibold text-gray-900">{form.testName || 'Pending entry'}</p>
          </div>
          <div>
            <p className="text-gray-400 uppercase text-xs mb-1">Observed Value</p>
            <p className="font-semibold text-gray-900">
              {form.observedValue || 'Pending entry'} {form.unit || ''}
            </p>
          </div>
          <div>
            <p className="text-gray-400 uppercase text-xs mb-1">Auto-flagged</p>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                previewFlag === 'High'
                  ? 'bg-red-100 text-red-700'
                  : previewFlag === 'Low'
                  ? 'bg-blue-100 text-blue-700'
                  : previewFlag === 'Normal'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-violet-100 text-violet-700'
              }`}
            >
              {previewFlag}
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingId ? 'Edit Result' : 'Enter result'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sample ID</label>
              <input
                name="sampleId"
                value={form.sampleId}
                onChange={handleChange}
                required
                placeholder="SMP-1001"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
              <input
                name="testName"
                value={form.testName}
                onChange={handleChange}
                required
                placeholder="Blood glucose (fasting)"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Result Value</label>
                <input
                  name="observedValue"
                  type="number"
                  step="0.01"
                  value={form.observedValue}
                  onChange={handleChange}
                  required
                  placeholder="118"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  required
                  placeholder="mg/dL"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference range (low)
                </label>
                <input
                  name="referenceMin"
                  type="number"
                  step="0.01"
                  value={form.referenceMin}
                  onChange={handleChange}
                  required
                  placeholder="70"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference range (high)
                </label>
                <input
                  name="referenceMax"
                  type="number"
                  step="0.01"
                  value={form.referenceMax}
                  onChange={handleChange}
                  required
                  placeholder="99"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm text-gray-500 mb-2">Auto-detected flag</p>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                  previewFlag === 'High'
                    ? 'bg-red-100 text-red-700'
                    : previewFlag === 'Low'
                    ? 'bg-blue-100 text-blue-700'
                    : previewFlag === 'Normal'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-violet-100 text-violet-700'
                }`}
              >
                {previewFlag}
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`rounded-lg px-4 py-2 font-semibold text-white transition ${
                  saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700'
                }`}
              >
                {saving ? 'Saving...' : editingId ? 'Update result' : 'Save result'}
              </button>
            </div>
          </form>
        </section>

        <section className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recently entered results</h2>
            <span className="text-sm text-gray-500">{results.length} total</span>
          </div>

          <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
            <input
              type="date"
              name="date"
              value={filters.date}
              onChange={handleFilterChange}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <input
              type="text"
              name="testName"
              value={filters.testName}
              onChange={handleFilterChange}
              placeholder="Filter by test type"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <select
              name="flag"
              value={filters.flag}
              onChange={handleFilterChange}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="">All flags</option>
              {FLAG_OPTIONS.map((flag) => (
                <option key={flag} value={flag}>
                  {flag}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="sampleId"
              value={filters.sampleId}
              onChange={handleFilterChange}
              placeholder="Filter by sample ID"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <div className="sm:col-span-2 xl:col-span-4 flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Apply filters
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </form>

          {loading ? (
            <p className="text-gray-500">Loading results...</p>
          ) : results.length === 0 ? (
            <p className="text-gray-500">No results found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-3 pr-4">Test</th>
                    <th className="py-3 pr-4">Sample ID</th>
                    <th className="py-3 pr-4">Result</th>
                    <th className="py-3 pr-4">Unit</th>
                    <th className="py-3 pr-4">Reference Range</th>
                    <th className="py-3 pr-4">Flag</th>
                    <th className="py-3 pr-4">Entered</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result._id} className="border-b border-gray-100 align-top">
                      <td className="py-4 pr-4 font-medium text-gray-900">{result.testName}</td>
                      <td className="py-4 pr-4 text-gray-600">{result.sampleId}</td>
                      <td className="py-4 pr-4">{result.observedValue}</td>
                      <td className="py-4 pr-4">{result.unit}</td>
                      <td className="py-4 pr-4">
                        {result.referenceRange?.min} - {result.referenceRange?.max}
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            result.flag === 'High'
                              ? 'bg-red-100 text-red-700'
                              : result.flag === 'Low'
                              ? 'bg-blue-100 text-blue-700'
                              : result.flag === 'Normal'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-violet-100 text-violet-700'
                          }`}
                        >
                          {result.flag}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-gray-600">{formatDateTime(result.createdAt)}</td>
                      <td className="py-4 pr-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(result)}
                            className="rounded-lg border border-sky-600 px-3 py-1.5 text-sky-700 hover:bg-sky-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(result._id)}
                            className="rounded-lg border border-red-600 px-3 py-1.5 text-red-700 hover:bg-red-50"
                          >
                            Delete
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
      </div>
    </div>
  );
}

export default ResultManagementPage;