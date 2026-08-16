import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : 'N/A';
}

function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadCart = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const { data } = await apiClient.get('/cart');
      setCart(data && Array.isArray(data.items) ? data : { items: [] });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your cart.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const handleQuantityChange = async (itemId, quantity) => {
    if (!quantity || quantity < 1) return;
    setActingId(itemId);
    setError('');
    try {
      await apiClient.put(`/cart/${itemId}`, { quantity });
      await loadCart(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update quantity.');
    } finally {
      setActingId('');
    }
  };

  const handleRemove = async (itemId) => {
    setActingId(itemId);
    setError('');
    try {
      await apiClient.delete(`/cart/${itemId}`);
      await loadCart(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove item.');
    } finally {
      setActingId('');
    }
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    setError('');
    setMessage('');
    try {
      const { data } = await apiClient.post('/cart/checkout');
      setMessage(data.message);
      await loadCart(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed.');
    } finally {
      setCheckingOut(false);
    }
  };

  const items = cart.items || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-gray-900">Your Cart</h1>
        <p className="mt-2 text-sm text-gray-500">
          Review your reserved blood units before checking out.
        </p>
      </div>

      {(error || message) && (
        <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading cart...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
          Your cart is empty.
          <div className="mt-4">
            <button
              type="button"
              onClick={() => navigate('/blood')}
              className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
            >
              Browse Available Blood
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {items.map((item) => (
              <div key={item._id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div>
                  <p className="font-semibold text-gray-900">
                    {item.bloodUnit?.bloodGroup} · {item.bloodUnit?.componentType}
                  </p>
                  <p className="text-sm text-gray-500">Hospital: {item.bloodUnit?.hospital}</p>
                  <p className="text-sm text-gray-500">
                    Expires: {item.bloodUnit ? formatDate(item.bloodUnit.expiryDate) : 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    disabled={actingId === item._id}
                    onChange={(event) => handleQuantityChange(item._id, Number(event.target.value))}
                    className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemove(item._id)}
                    disabled={actingId === item._id}
                    className="rounded-lg border border-red-600 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={checkingOut}
            className={`w-full rounded-lg px-4 py-3 font-semibold text-white transition ${
              checkingOut ? 'bg-gray-300 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700'
            }`}
          >
            {checkingOut ? 'Processing...' : 'Checkout / Reserve Units'}
          </button>
        </>
      )}
    </div>
  );
}

export default CartPage;