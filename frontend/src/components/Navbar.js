import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES, ROLE_LABELS } from '../constants/roles';
import apiClient from '../api/client';

// Which nav links each role is allowed to see. Kept in lockstep with the
// route guards in App.js and the backend's requireRole checks.
const NAV_ITEMS_BY_ROLE = {
  [ROLES.PATIENT]: [
    { label: 'Book Tests', to: '/booking' },
    { label: 'Sample Status', to: '/sample-status' },
    { label: 'Reports', to: '/report-approval' },
    { label: 'Blood Request', to: '/blood-request' },
    { label: 'Medicine Search', to: '/medicine-search' },
    { label: 'Medicine Requests', to: '/medicine-request' },
    { label: 'Support', to: '/support' },
  ],
  [ROLES.LAB_STAFF]: [
    { label: 'Results', to: '/results' },
    { label: 'Sample Status', to: '/sample-status' },
  ],
  [ROLES.DOCTOR]: [{ label: 'Report Approval', to: '/report-approval' }],
  [ROLES.DONOR]: [{ label: 'Donor Profile', to: '/donor-profile' }],
  [ROLES.HOSPITAL_STAFF]: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Blood Request', to: '/blood-request' },
  ],
  [ROLES.PHARMACY]: [
    { label: 'Medicine Stock', to: '/pharmacy-stock' },
    { label: 'Medicine Requests', to: '/medicine-requests' },
  ],
  [ROLES.ADMIN]: [
    { label: 'Bookings', to: '/admin/bookings' },
    { label: 'Diagnostic Tests', to: '/tests' },
    { label: 'Blood Requests', to: '/blood-request' },
    { label: 'Users', to: '/admin/users' },
  ],
};

const PENDING_REQUEST_POLL_MS = 30000;
// MyDonorProfilePage fires this the moment an Accept/Reject succeeds, so the badge doesn't
// have to wait for the next poll to reflect it.
export const DONATION_REQUESTS_CHANGED_EVENT = 'donation-requests-changed';

// Lets a donor notice a new emergency-request match without having to open their profile —
// polls the same pending-requests list MyDonorProfilePage already displays, and refreshes
// immediately on DONATION_REQUESTS_CHANGED_EVENT.
function usePendingDonationRequestCount(isDonor) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isDonor) return undefined;

    let cancelled = false;
    const fetchCount = async () => {
      try {
        const { data } = await apiClient.get('/donation-requests/me');
        if (!cancelled) setCount(Array.isArray(data) ? data.length : 0);
      } catch {
        // Non-fatal: badge just stays at its last known value.
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, PENDING_REQUEST_POLL_MS);
    window.addEventListener(DONATION_REQUESTS_CHANGED_EVENT, fetchCount);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener(DONATION_REQUESTS_CHANGED_EVENT, fetchCount);
    };
  }, [isDonor]);

  return count;
}

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = NAV_ITEMS_BY_ROLE[user?.role] || [];
  const pendingRequestCount = usePendingDonationRequestCount(user?.role === ROLES.DONOR);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <span className="text-lg font-extrabold tracking-wide text-gray-900">
          MEDILAB CONNECT
        </span>
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `pb-1 transition ${
                  isActive
                    ? 'text-sky-700 font-semibold border-b-2 border-sky-600'
                    : 'text-gray-500 hover:text-gray-800'
                }`
              }
              end={item.to === '/'}
            >
              {item.label}
              {item.to === '/donor-profile' && pendingRequestCount > 0 && (
                <span className="ml-1.5 inline-flex items-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {pendingRequestCount}
                </span>
              )}
            </NavLink>
          ))}

          <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
            <span className="text-gray-600">
              {user?.name}
              {user?.role && (
                <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                  {ROLE_LABELS[user.role]}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
            >
              Log out
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
