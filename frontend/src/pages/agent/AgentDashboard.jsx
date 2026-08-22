import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { StatusBadge, formatDate, shortId, getErrorMsg } from '../../lib/utils.jsx';
import Navbar from '../../components/Navbar.jsx';

const AGENT_STATUSES = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];

export default function AgentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = () => {
    Promise.all([
      api.get('/orders'),
      api.get('/agents/me')
    ]).then(([or, pr]) => {
      setOrders(or.data);
      setProfile(pr.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setActionLoading(true); setError('');
    try {
      await api.patch(`/orders/${statusModal}/status`, { status: newStatus, note: statusNote });
      setStatusModal(null); setNewStatus(''); setStatusNote('');
      fetchAll();
    } catch (err) { setError(getErrorMsg(err)); }
    finally { setActionLoading(false); }
  };

  const toggleAvailability = async () => {
    try {
      await api.patch('/agents/availability', { isAvailable: !profile?.profile?.isAvailable });
      fetchAll();
    } catch (err) { setError(getErrorMsg(err)); }
  };

  return (
    <>
      <Navbar />
      <div className="page-wrapper">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Agent Dashboard</h1>
            <p className="page-subtitle">Welcome, {user?.name} — Zone: {profile?.profile?.zone?.name || '...'}</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              className={`btn ${profile?.profile?.isAvailable ? 'btn-success' : 'btn-secondary'}`}
              onClick={toggleAvailability}
            >
              {profile?.profile?.isAvailable ? 'Available' : 'Set Available'}
            </button>
            <button className="btn btn-ghost" onClick={logout}>Logout</button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 28 }}>
          <div className="stat-card"><div className="stat-label">Assigned</div><div className="stat-value">{orders.length}</div></div>
          <div className="stat-card"><div className="stat-label">Delivered Today</div><div className="stat-value" style={{ color: 'var(--success)' }}>{orders.filter(o => o.status === 'DELIVERED').length}</div></div>
          <div className="stat-card"><div className="stat-label">Active</div><div className="stat-value" style={{ color: 'var(--accent)' }}>{orders.filter(o => !['DELIVERED','FAILED'].includes(o.status)).length}</div></div>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="card-title">My Assigned Orders</h2></div>
          {loading ? (
            <div className="loading-page" style={{ minHeight: 200 }}><span className="spinner" /></div>
          ) : orders.length === 0 ? (
            <div className="empty-state"><div className="empty-icon"></div><h3>No orders assigned</h3><p>Check back later</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Pickup → Drop</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}
                        onClick={() => navigate(`/orders/${order.id}`)}>
                        {shortId(order.id)}
                      </td>
                      <td>
                        <div>{order.customer?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.customer?.phone || '—'}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <div>{order.pickupAddress?.slice(0, 25)}...</div>
                        <div style={{ color: 'var(--text-muted)' }}>{order.dropAddress?.slice(0, 25)}...</div>
                      </td>
                      <td>{order.orderType} / {order.paymentType}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td style={{ fontSize: 12 }}>{formatDate(order.createdAt)}</td>
                      <td>
                        {!['DELIVERED', 'CANCELLED'].includes(order.status) && (
                          <button
                            id={`update-status-${order.id}`}
                            className="btn btn-primary btn-sm"
                            onClick={() => { setStatusModal(order.id); setNewStatus(''); setStatusNote(''); }}
                          >
                            Update Status
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Status Update Modal */}
        {statusModal && (
          <div className="modal-overlay" onClick={() => setStatusModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3 style={{ marginBottom: 16 }}>Update Order Status</h3>
              <div className="form-group">
                <label className="form-label">New Status</label>
                <select className="form-select" id="agent-status-select" value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}>
                  <option value="">— Select status —</option>
                  {AGENT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Note (optional)</label>
                <textarea className="form-textarea" id="agent-status-note"
                  placeholder="e.g. Customer not available, gate locked..."
                  value={statusNote} onChange={e => setStatusNote(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button className="btn btn-ghost" onClick={() => setStatusModal(null)}>Cancel</button>
                <button
                  id="confirm-agent-status"
                  className="btn btn-primary"
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || actionLoading}
                >
                  {actionLoading ? <span className="spinner" /> : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
