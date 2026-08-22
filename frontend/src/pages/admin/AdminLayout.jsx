import { useNavigate, NavLink, Routes, Route } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar.jsx';
import AdminOrders from './AdminOrders.jsx';
import AdminZones from './AdminZones.jsx';
import AdminRateCards from './AdminRateCards.jsx';
import AdminAgents from './AdminAgents.jsx';
import AdminOverview from './AdminOverview.jsx';
import AdminCreateOrder from './AdminCreateOrder.jsx';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { path: '/admin', label: 'Overview', end: true },
    { path: '/admin/orders', label: 'All Orders' },
    { path: '/admin/create-order', label: 'Create Order' },
    { path: '/admin/zones', label: 'Zones & Areas' },
    { path: '/admin/rate-cards', label: 'Rate Cards' },
    { path: '/admin/agents', label: 'Agents' },
  ];

  return (
    <>
      <Navbar />
      <div className="app-layout">
        <aside className="sidebar">
          <div style={{ padding: '0 12px 16px', marginBottom: 8, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Admin Panel</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
          </div>
          <nav>
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div style={{ position: 'absolute', bottom: 20, left: 12, right: 12 }}>
            <button className="sidebar-link" onClick={logout} style={{ width: '100%' }}>
              Logout
            </button>
          </div>
        </aside>
        <main className="main-content">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="zones" element={<AdminZones />} />
            <Route path="create-order" element={<AdminCreateOrder />} />
            <Route path="rate-cards" element={<AdminRateCards />} />
            <Route path="agents" element={<AdminAgents />} />
          </Routes>
        </main>
      </div>
    </>
  );
}
