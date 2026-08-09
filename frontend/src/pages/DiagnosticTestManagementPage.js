import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';

const emptyForm = {
  testName: '',
  price: '',
  sampleType: '',
  unit: '',
  referenceMin: '',
  referenceMax: '',
  estimatedDeliveryHours: '',
};

function formatReferenceRange(referenceRange) {
  if (!referenceRange) return 'N/A';
  return `${referenceRange.min} - ${referenceRange.max}`;
}

function DiagnosticTestManagementPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const selectedTest = useMemo(
    () => tests.find((test) => test._id === editingId) || null,
    [tests, editingId]
  );

  const loadTests = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/tests');
      setTests(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load diagnostic tests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  useEffect(() => {
    if (!selectedTest) return;

    setForm({
      testName: selectedTest.testName || '',
      price: selectedTest.price ?? '',
      sampleType: selectedTest.sampleType || '',
      unit: selectedTest.unit || '',
      referenceMin: selectedTest.referenceRange?.min ?? '',
      referenceMax: selectedTest.referenceRange?.max ?? '',
      estimatedDeliveryHours: selectedTest.estimatedDeliveryHours ?? '',
    });
  }, [selectedTest]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    const payload = {
      testName: form.testName.trim(),
      price: Number(form.price),
      sampleType: form.sampleType.trim(),
      unit: form.unit.trim(),
      referenceRange: {
        min: Number(form.referenceMin),
        max: Number(form.referenceMax),
      },
      estimatedDeliveryHours: Number(form.estimatedDeliveryHours),
    };

    try {
      if (editingId) {
        await apiClient.put(`/tests?id=${editingId}`, payload);
        setMessage('Diagnostic test updated successfully.');
      } else {
        await apiClient.post('/tests', payload);
        setMessage('Diagnostic test created successfully.');
      }

      resetForm();
      await loadTests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save diagnostic test.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (test) => {
    setEditingId(test._id);
  };

  const handleDelete = async (testId) => {
    const confirmed = window.confirm('Delete this diagnostic test?');
    if (!confirmed) return;

    try {
      setMessage('');
      await apiClient.delete(`/tests?id=${testId}`);
      if (editingId === testId) {
        resetForm();
      }
      setMessage('Diagnostic test deleted successfully.');
      await loadTests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete diagnostic test.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Diagnostic Test Management</h1>
        <p className="mt-2 text-sm text-gray-500">
          Add, update, and delete diagnostic tests such as CBC, Blood Glucose, ALT, Creatinine,
          Lipid Profile, Thyroid Test, and Urine Test.
        </p>
      </div>

      {(error || message) && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingId ? 'Edit Test' : 'Add New Test'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
              <input
                name="testName"
                value={form.testName}
                onChange={handleChange}
                required
                placeholder="CBC"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sample Type</label>
                <input
                  name="sampleType"
                  value={form.sampleType}
                  onChange={handleChange}
                  required
                  placeholder="Blood"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Delivery Time (Hours)
                </label>
                <input
                  name="estimatedDeliveryHours"
                  type="number"
                  min="1"
                  value={form.estimatedDeliveryHours}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Range Min</label>
                <input
                  name="referenceMin"
                  type="number"
                  step="0.01"
                  value={form.referenceMin}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Range Max</label>
                <input
                  name="referenceMax"
                  type="number"
                  step="0.01"
                  value={form.referenceMax}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className={`w-full rounded-lg px-4 py-3 font-semibold transition ${
                saving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
            >
              {saving ? 'Saving...' : editingId ? 'Update Test' : 'Create Test'}
            </button>
          </form>
        </section>

        <section className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Existing Diagnostic Tests</h2>
            <span className="text-sm text-gray-500">{tests.length} total</span>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading tests...</p>
          ) : tests.length === 0 ? (
            <p className="text-gray-500">No diagnostic tests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-3 pr-4">Test</th>
                    <th className="py-3 pr-4">Price</th>
                    <th className="py-3 pr-4">Sample</th>
                    <th className="py-3 pr-4">Unit</th>
                    <th className="py-3 pr-4">Reference Range</th>
                    <th className="py-3 pr-4">Delivery</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test) => (
                    <tr key={test._id} className="border-b border-gray-100 align-top">
                      <td className="py-4 pr-4 font-medium text-gray-900">{test.testName}</td>
                      <td className="py-4 pr-4">৳{test.price}</td>
                      <td className="py-4 pr-4">{test.sampleType}</td>
                      <td className="py-4 pr-4">{test.unit}</td>
                      <td className="py-4 pr-4">{formatReferenceRange(test.referenceRange)}</td>
                      <td className="py-4 pr-4">{test.estimatedDeliveryHours} hrs</td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(test)}
                            className="rounded-lg border border-sky-600 px-3 py-1.5 text-sky-700 hover:bg-sky-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(test._id)}
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

export default DiagnosticTestManagementPage;