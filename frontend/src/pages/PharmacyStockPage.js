import { useEffect, useState } from 'react';
import apiClient from '../api/client';

const emptyForm = {
  medicineName: '',
  brand: '',
  location: '',
  batchNumber: '',
  expiryDate: '',
  availableQuantity: '',
  price: '',
  prescriptionRequired: false,
  alternativeMedicines: '',
};

const STATUS_STYLES = {
  'In Stock': 'bg-emerald-100 text-emerald-700',
  'Low Stock': 'bg-amber-100 text-amber-700',
  'Out of Stock': 'bg-gray-200 text-gray-700',
  'Expiring Soon': 'bg-orange-100 text-orange-700',
  Expired: 'bg-red-100 text-red-700',
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
        STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {status}
    </span>
  );
}

function PharmacyStockPage() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/pharmacy-medicines/me');
      setMedicines(Array.isArray(data.medicines) ? data.medicines : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your medicine stock.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setMessage('');
    setError('');
  };

  const handleEditClick = (medicine) => {
    setForm({
      medicineName: medicine.medicineName || '',
      brand: medicine.brand || '',
      location: medicine.location || '',
      batchNumber: medicine.batchNumber || '',
      expiryDate: medicine.expiryDate ? medicine.expiryDate.slice(0, 10) : '',
      availableQuantity: medicine.availableQuantity ?? '',
      price: medicine.price ?? '',
      prescriptionRequired: !!medicine.prescriptionRequired,
      alternativeMedicines: (medicine.alternativeMedicines || []).join(', '),
    });
    setEditingId(medicine._id);
    setShowForm(true);
    setMessage('');
    setError('');
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const payload = {
      medicineName: form.medicineName.trim(),
      brand: form.brand.trim(),
      location: form.location.trim(),
      batchNumber: form.batchNumber.trim(),
      expiryDate: form.expiryDate,
      availableQuantity: Number(form.availableQuantity),
      price: Number(form.price),
      prescriptionRequired: form.prescriptionRequired,
      alternativeMedicines: form.alternativeMedicines
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean),
    };

    try {
      if (editingId) {
        await apiClient.put(`/pharmacy-medicines/${editingId}`, payload);
        setMessage('Medicine updated successfully.');
      } else {
        await apiClient.post('/pharmacy-medicines', payload);
        setMessage('Medicine added to your inventory.');
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      await loadMedicines();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save medicine.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (medicine) => {
    const confirmed = window.confirm(`Remove "${medicine.medicineName}" (batch ${medicine.batchNumber}) from your inventory?`);
    if (!confirmed) return;

    setDeletingId(medicine._id);
    setError('');
    setMessage('');
    try {
      await apiClient.delete(`/pharmacy-medicines/${medicine._id}`);
      setMessage('Medicine removed.');
      await loadMedicines();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove medicine.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medicine Stock &amp; Expiry</h1>
          <p className="mt-2 text-sm text-gray-500">
            Manage your pharmacy's medicine inventory. Stock status is calculated automatically from
            quantity and expiry date.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={handleAddNew}
            className="shrink-0 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            + Add Medicine
          </button>
        )}
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

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8 max-w-3xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Medicine' : 'Add Medicine'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name</label>
                <input
                  name="medicineName"
                  value={form.medicineName}
                  onChange={handleChange}
                  required
                  placeholder="Paracetamol"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <input
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  required
                  placeholder="Square"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                <input
                  name="batchNumber"
                  value={form.batchNumber}
                  onChange={handleChange}
                  required
                  placeholder="B-2026-014"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  name="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  name="availableQuantity"
                  type="number"
                  min="0"
                  value={form.availableQuantity}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (৳)</label>
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pharmacy Location</label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                required
                placeholder="Dhanmondi, Dhaka"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alternative Medicines (optional)
              </label>
              <input
                name="alternativeMedicines"
                value={form.alternativeMedicines}
                onChange={handleChange}
                placeholder="Napa, Ace, Fast (comma-separated)"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                name="prescriptionRequired"
                type="checkbox"
                checked={form.prescriptionRequired}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-200"
              />
              Prescription required
            </label>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className={`flex-1 rounded-lg px-4 py-3 font-semibold transition ${
                  saving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Medicine'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Inventory</h2>
          <span className="text-sm text-gray-500">{medicines.length} medicine{medicines.length === 1 ? '' : 's'}</span>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading your medicine stock...</p>
        ) : medicines.length === 0 ? (
          <p className="text-gray-500">
            You haven't added any medicines yet. Click "Add Medicine" to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4">Medicine</th>
                  <th className="py-3 pr-4">Brand</th>
                  <th className="py-3 pr-4">Batch #</th>
                  <th className="py-3 pr-4">Qty</th>
                  <th className="py-3 pr-4">Price</th>
                  <th className="py-3 pr-4">Expiry</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((medicine) => (
                  <tr key={medicine._id} className="border-b border-gray-100 align-top">
                    <td className="py-4 pr-4 font-medium text-gray-900">{medicine.medicineName}</td>
                    <td className="py-4 pr-4 text-gray-600">{medicine.brand}</td>
                    <td className="py-4 pr-4 text-gray-600">{medicine.batchNumber}</td>
                    <td className="py-4 pr-4 text-gray-600">{medicine.availableQuantity}</td>
                    <td className="py-4 pr-4 text-gray-600">৳{medicine.price}</td>
                    <td className="py-4 pr-4 text-gray-600">{formatDate(medicine.expiryDate)}</td>
                    <td className="py-4 pr-4">
                      <StatusBadge status={medicine.stockStatus} />
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditClick(medicine)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(medicine)}
                          disabled={deletingId === medicine._id}
                          className={`rounded-lg border px-3 py-1.5 transition ${
                            deletingId === medicine._id
                              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                              : 'border-red-600 text-red-700 hover:bg-red-50'
                          }`}
                        >
                          {deletingId === medicine._id ? 'Removing...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PharmacyStockPage;
