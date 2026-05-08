import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, Droplets, CreditCard,
  AlertTriangle, Users, BarChart2, Settings, LogOut, User, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

const navConfig = {
  admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { section: 'Manage' },
    { to: '/customers', icon: Users,          label: 'Customers' },
    { to: '/bills',     icon: FileText,        label: 'Bills' },
    { to: '/usage',     icon: Droplets,        label: 'Water Usage' },
    { to: '/payments',  icon: CreditCard,      label: 'Payments' },
    { to: '/rates',     icon: DollarSign,      label: 'Billing Rates' },
    { section: 'Reports' },
    { to: '/reports',   icon: BarChart2,       label: 'Reports' },
    { to: '/leakages',  icon: AlertTriangle,   label: 'Leakage Reports' },
  ],
  branch_manager: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { section: 'Operations' },
    { to: '/customers', icon: Users,          label: 'Customers' },
    { to: '/bills',     icon: FileText,        label: 'Bills' },
    { to: '/usage',     icon: Droplets,        label: 'Water Usage' },
    { section: 'Reports' },
    { to: '/reports',   icon: BarChart2,       label: 'Reports' },
    { to: '/leakages',  icon: AlertTriangle,   label: 'Leakage Reports' },
  ],
  customer: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { section: 'My Account' },
    { to: '/bills',    icon: FileText,   label: 'My Bills' },
    { to: '/usage',    icon: Droplets,   label: 'My Usage' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    { to: '/leakages', icon: AlertTriangle, label: 'Report Leakage' },
  ],
};

const roleLabel = { admin: 'Admin', branch_manager: 'Branch Manager', customer: 'Customer' };
const roleClass = { admin: 'role-admin', branch_manager: 'role-manager', customer: 'role-customer' };

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = navConfig[user?.role] || navConfig.customer;

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-text">💧 WASCO</div>
        <div className="logo-sub">Water & Sewerage Co.</div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item, i) =>
          item.section ? (
            <div key={i} className="nav-section-label">{item.section}</div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          )
        )}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <User size={17} />
          Profile
        </NavLink>
        <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--clr-danger)' }}>
          <LogOut size={17} />
          Logout
        </button>
        <div style={{ padding: '0.8rem 0.9rem 0', fontSize: '0.8rem' }}>
          <div style={{ color: 'var(--clr-text)', fontWeight: 600 }}>{user?.name}</div>
          <span className={`role-badge ${roleClass[user?.role]}`}>{roleLabel[user?.role]}</span>
        </div>
      </div>
    </div>
  );
}
