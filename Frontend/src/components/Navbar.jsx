import { NavLink } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">Time Off Tracker</div>
      <div className="navbar-links">
        <NavLink to="/employee" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Employee
        </NavLink>
        <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Admin
        </NavLink>
      </div>
    </nav>
  );
}

export default Navbar;
