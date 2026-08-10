import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Diagnostic Tests', to: '/tests' },
  { label: 'Results', to: '/results' },
  { label: 'Sample Status', to: '/sample-status' },
  { label: 'Reports', to: '/report-approval' },
  { label: 'Donor Profile', to: '/donor-profile' },
];

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
          {NAV_ITEMS.map((item) => (
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
            </NavLink>
          ))}

          <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
            <span className="text-gray-600">{user?.name}</span>
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
