import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../constants/roles';

// Hospital Staff and Pharmacy roles exist in the system but their features
// (blood inventory, medicine stock, etc.) haven't been built yet.
function PlaceholderDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {ROLE_LABELS[user?.role] || 'Dashboard'}
      </h1>
      <p className="text-gray-500">
        There are no features available for this role yet. Check back once this module is built.
      </p>
    </div>
  );
}

export default PlaceholderDashboardPage;
