import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : 'N/A';
}

function AvailableBloodPage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState('');
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadUnits = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/blood-inventory', { params: { status: 'Available' } });
      const usable = (Array.isArray(data) ? data : []).filter(
        (unit) => new Date(unit.expiryDate) > new Date() && unit.quantity > 0
      );
      setUnits(usable);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load available blood units.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const handleAddToCart = async (unitId) => {
    setAddingId(unitId);
    setError('');
    setMessage('');
    const quantity = Number(quantities[unitId] || 1);
    try {
      await apiClient.post('/cart', { bloodUnitId: unitId, quantity });
      setMessage('Added to your cart.');
      await loadUnits();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add to cart.');
    } finally {
      setAddingId('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-gray-900">Available Blood Units</h1>
        <p className="mt-2 text-sm text-gray-500">
          Browse blood currently in stock and reserve what you need.
        </p>
      </div>

      {(error || message) && (
        <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading available blood units...</p>
      ) : units.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-gray-500">
          No blood units are currently available.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {units.map((unit) => (
            <div key={unit._id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-red-700">{unit.bloodGroup}</span>
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                  {unit.componentType}
                </span>
              </div>
              <p className="text-sm text-gray-600">Hospital: {unit.hospital}</p>
              <p className="text-sm text-gray-600">Available: {unit.quantity} unit(s)</p>
              <p className="text-sm text-gray-600 mb-4">Expires: {formatDate(unit.expiryDate)}</p>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={unit.quantity}
                  value={quantities[unit._id] ?? 1}
                  onChange={(event) => setQuantities((prev) => ({ ...prev, [unit._id]: event.target.value }))}
                  className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
                <button
                  type="button"
                  onClick={() => handleAddToCart(unit._id)}
                  disabled={addingId === unit._id}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${
                    addingId === unit._id ? 'bg-gray-300 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700'
                  }`}
                >
                  {addingId === unit._id ? 'Adding...' : 'Add to Cart'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AvailableBloodPage;