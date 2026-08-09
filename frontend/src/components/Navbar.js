import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Diagnostic Tests', to: '/tests' },
  { label: 'Results', to: '/results' },
  { label: 'Reports', to: '#' },
  { label: 'Profile', to: '#' },
];

function Navbar() {
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
                  isActive && item.to !== '#'
                    ? 'text-sky-700 font-semibold border-b-2 border-sky-600'
                    : 'text-gray-500 hover:text-gray-800'
                } ${item.to === '#' ? 'pointer-events-none cursor-default' : ''}`
              }
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
