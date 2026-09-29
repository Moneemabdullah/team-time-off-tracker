import { NavLink } from 'react-router-dom';

function Navbar() {
  const linkClass = ({ isActive }) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
      <div className="text-lg font-semibold text-gray-900">Time Off Tracker</div>
      <div className="flex gap-3">
        <NavLink to="/employee" className={linkClass}>
          Employee
        </NavLink>
        <NavLink to="/admin" className={linkClass}>
          Admin
        </NavLink>
      </div>
    </nav>
  );
}

export default Navbar;
