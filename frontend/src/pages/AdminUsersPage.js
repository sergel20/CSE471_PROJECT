import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { ROLE_LABELS, ROLE_OPTIONS } from '../constants/roles';

function formatDateTime(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [roleDrafts, setRoleDrafts] = useState({});

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/auth/users');
      setUsers(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleDraftChange = (userId, role) => {
    setRoleDrafts((prev) => ({ ...prev, [userId]: role }));
  };

  const handleSaveRole = async (userId) => {
    const nextRole = roleDrafts[userId];
    if (!nextRole) return;

    setSavingId(userId);
    setMessage('');
    setError('');
    try {
      await apiClient.put(`/auth/users/${userId}/role`, { role: nextRole });
      setMessage('User role updated successfully.');
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user role.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-sm text-gray-500">
          Verify and assign roles for every account in the system.
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

      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
          <span className="text-sm text-gray-500">{users.length} total</span>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">Email</th>
                  <th className="py-3 pr-4">Joined</th>
                  <th className="py-3 pr-4">Role</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const draft = roleDrafts[u._id] ?? u.role;
                  const dirty = draft !== u.role;
                  return (
                    <tr key={u._id} className="border-b border-gray-100 align-top">
                      <td className="py-4 pr-4 font-medium text-gray-900">{u.name}</td>
                      <td className="py-4 pr-4 text-gray-600">{u.email}</td>
                      <td className="py-4 pr-4 text-gray-600">{formatDateTime(u.createdAt)}</td>
                      <td className="py-4 pr-4">
                        <select
                          value={draft}
                          onChange={(e) => handleRoleDraftChange(u._id, e.target.value)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 pr-4">
                        <button
                          type="button"
                          disabled={!dirty || savingId === u._id}
                          onClick={() => handleSaveRole(u._id)}
                          className={`rounded-lg border px-3 py-1.5 transition ${
                            !dirty || savingId === u._id
                              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                              : 'border-sky-600 text-sky-700 hover:bg-sky-50'
                          }`}
                        >
                          {savingId === u._id ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminUsersPage;
