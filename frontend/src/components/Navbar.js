const NAV_ITEMS = ['Home', 'Diagnostic Tests', 'Reports', 'Profile'];

function Navbar() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <span className="text-lg font-extrabold tracking-wide text-gray-900">
          MEDILAB CONNECT
        </span>
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          {NAV_ITEMS.map((item) => (
            <span
              key={item}
              className={
                item === 'Diagnostic Tests'
                  ? 'text-sky-700 font-semibold border-b-2 border-sky-600 pb-1'
                  : 'text-gray-500'
              }
            >
              {item}
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
