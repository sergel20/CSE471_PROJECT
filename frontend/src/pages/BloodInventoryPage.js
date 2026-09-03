import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENT_TYPES = ['Whole Blood', 'Plasma', 'Platelets', 'Red Blood Cells', 'Cryoprecipitate'];

const emptyForm = {
  bloodGroup: 'A+',
  componentType: 'Whole Blood',
  quantity: '',
  collectionDate: '',
  expiryDate: '',
  hospital: '',
};

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : 'N/A';
}

function StatusBadge({ status }) {
  const styles = {
    Available: 'bg-emerald-100 text-emerald-700',
    Reserved: 'bg-sky-100 text-sky-700',
    Used: 'bg-gray-100 text-gray-700',
    Expired: 'bg-red-100 text-red-700',
    Discarded: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function BloodInventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiry, setExpiry] = useState({ expiringSoon: [], alreadyExpired: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, lowRes, expRes] = await Promise.all([
        apiClient.get('/blood-inventory'),
        apiClient.get('/blood-inventory/alerts/low-stock'),
        apiClient.get('/blood-inventory/alerts/expiry'),
      ]);
      setInventory(Array.isArray(invRes.data) ? invRes.data : []);
      setLowStock(Array.isArray(lowRes.data) ? lowRes.data : []);
      setExpiry(expRes.data || { expiringSoon: [], alreadyExpired: [] });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load blood inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiClient.post('/blood-inventory', {
        ...form,
        quantity: Number(form.quantity),
      });
      setMessage('Blood unit added to inventory.');
      setForm(emptyForm);
      setShowForm(false);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add blood unit.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (unitId) => {
    if (!window.confirm('Delete this blood unit record?')) return;
    setError('');
    setMessage('');
    try {
      await apiClient.delete(`/blood-inventory/${unitId}`);
      setMessage('Blood unit deleted.');
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete blood unit.');
    }
  };

  const alertCount = lowStock.length + expiry.expiringSoon.length + expiry.alreadyExpired.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blood Inventory</h1>
          <p className="mt-2 text-sm text-gray-500">
            Manage blood stock by group, component type, quantity, and expiry.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
        >
          {showForm ? 'Cancel' : '+ Add Blood Unit'}
        </button>
      </div>

      {(error || message) && (
        <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      {alertCount > 0 && (
        <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="mb-3 font-semibold text-amber-800">{alertCount} alert(s) need attention</h2>

          {lowStock.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-amber-800 mb-1">Low stock (below 5 units):</p>
              <ul className="text-sm text-amber-700 space-y-1">
                {lowStock.map((item) => (
                  <li key={`${item._id.bloodGroup}-${item._id.componentType}`}>
                    {item._id.bloodGroup} · {item._id.componentType} — {item.totalQuantity} unit(s) left
                  </li>
                ))}
              </ul>
            </div>
          )}

          {expiry.expiringSoon.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-amber-800 mb-1">Expiring within 7 days:</p>
              <ul className="text-sm text-amber-700 space-y-1">
                {expiry.expiringSoon.map((unit) => (
                  <li key={unit._id}>
                    {unit.bloodGroup} · {unit.componentType} — expires {formatDate(unit.expiryDate)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {expiry.alreadyExpired.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-700 mb-1">Already expired (still marked Available):</p>
              <ul className="text-sm text-red-700 space-y-1">
                {expiry.alreadyExpired.map((unit) => (
                  <li key={unit._id}>
                    {unit.bloodGroup} · {unit.componentType} — expired {formatDate(unit.expiryDate)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {showForm && (
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-5">Add Blood Unit</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
              <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200">
                {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Component Type</label>
              <select name="componentType" value={form.componentType} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200">
                {COMPONENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (units)</label>
              <input type="number" name="quantity" min="0" required value={form.quantity} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
              <input type="text" name="hospital" required value={form.hospital} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Collection Date</label>
              <input type="date" name="collectionDate" required value={form.collectionDate} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input type="date" name="expiryDate" required value={form.expiryDate} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200" />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className={`w-full rounded-lg px-4 py-3 font-semibold transition ${saving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-sky-600 text-white hover:bg-sky-700'}`}
              >
                {saving ? 'Saving...' : 'Save Blood Unit'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Current Stock</h2>
          <span className="text-sm text-gray-500">{inventory.length} total</span>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading inventory...</p>
        ) : inventory.length === 0 ? (
          <p className="text-gray-500">No blood units in stock.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4">Group</th>
                  <th className="py-3 pr-4">Component</th>
                  <th className="py-3 pr-4">Qty</th>
                  <th className="py-3 pr-4">Collected</th>
                  <th className="py-3 pr-4">Expires</th>
                  <th className="py-3 pr-4">Hospital</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((unit) => (
                  <tr key={unit._id} className="border-b border-gray-100 align-top">
                    <td className="py-4 pr-4 font-semibold text-gray-900">{unit.bloodGroup}</td>
                    <td className="py-4 pr-4 text-gray-600">{unit.componentType}</td>
                    <td className="py-4 pr-4">{unit.quantity}</td>
                    <td className="py-4 pr-4 text-gray-600">{formatDate(unit.collectionDate)}</td>
                    <td className="py-4 pr-4 text-gray-600">{formatDate(unit.expiryDate)}</td>
                    <td className="py-4 pr-4 text-gray-600">{unit.hospital}</td>
                    <td className="py-4 pr-4"><StatusBadge status={unit.status} /></td>
                    <td className="py-4 pr-4">
                      <button type="button" onClick={() => handleDelete(unit._id)} className="rounded-lg border border-red-600 px-3 py-1.5 text-red-700 hover:bg-red-50">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default BloodInventoryPage;