import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { StatusBadge, formatCurrency, formatDate, shortId, getErrorMsg } from '../../lib/utils.jsx';

const ALL_STATUSES = ['CREATED','AGENT_ASSIGNED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED','RESCHEDULED','CANCELLED'];

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [overrideStatus, setOverrideStatus] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchOrders = () => {
    const params = filterStatus ? `?status=${filterStatus}` : '';
    api.get(`/orders${params}`).then(res => setOrders(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [filterStatus]);
  useEffect(() => { api.get('/agents').then(res => setAgents(res.data)); }, []);

  const handleAutoAssign = async (orderId) => {
    setActionLoading(true); setError('');
    try {
      await api.post(`/orders/${orderId}/auto-assign`);
      fetchOrders();
    } catch (err) { setError(getErrorMsg(err)); }
    finally { setActionLoading(false); }
  };

  const handleManualAssign = async () => {
    if (!selectedAgent) return;
    setActionLoading(true); setError('');
    try {
      await api.post(`/orders/${assignModal}/assign`, { agentId: selectedAgent });
      setAssignModal(null); setSelectedAgent('');
      fetchOrders();
    } catch (err) { setError(getErrorMsg(err)); }
    finally { setActionLoading(false); }
  };

  const handleStatusOverride = async () => {
    if (!overrideStatus) return;
    setActionLoading(true); setError('');
    try {
      await api.patch(`/orders/${statusModal}/status`, { status: overrideStatus, note: overrideNote || 'Admin override' });
      setStatusModal(null); setOverrideStatus(''); setOverrideNote('');
      fetchOrders();
    } catch (err) { setError(getErrorMsg(err)); }
    finally { setActionLoading(false); }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">All Orders</h1>
          <p className="page-subtitle">Manage, assign agents, and override order statuses</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select className="form-select" style={{ width: 220 }} value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)} id="filter-status">
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Type</th>
                <th>Charge</th>
                <th>Agent</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No orders found</td></tr>
              ) : orders.map(order => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
                    onClick={() => navigate(`/orders/${order.id}`)}>
                    {shortId(order.id)}
                  </td>
                  <td>{order.customer?.name || '—'}</td>
                  <td style={{ fontSize: 12 }}>{order.pickupPincode} → {order.dropPincode}</td>
                  <td>{order.orderType} / {order.paymentType}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(order.totalCharge)}</td>
                  <td style={{ fontSize: 13 }}>{order.agent?.name || <span style={{ color: 'var(--danger)' }}>Unassigned</span>}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td style={{ fontSize: 12 }}>{formatDate(order.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['CREATED', 'RESCHEDULED'].includes(order.status) && (
                        <>
                          <button id={`auto-assign-${order.id}`} className="btn btn-success btn-sm"
                            onClick={() => handleAutoAssign(order.id)} disabled={actionLoading}>
                            Auto
                          </button>
                          <button id={`manual-assign-${order.id}`} className="btn btn-secondary btn-sm"
                            onClick={() => { setAssignModal(order.id); setSelectedAgent(''); }}>
                            Manual
                          </button>
                        </>
                      )}
                      <button id={`override-${order.id}`} className="btn btn-ghost btn-sm"
                        onClick={() => { setStatusModal(order.id); setOverrideStatus(''); setOverrideNote(''); }}>
                        Override
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Assign Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Manually Assign Agent</h3>
            <div className="form-group">
              <label className="form-label">Select Agent</label>
              <select className="form-select" id="agent-select" value={selectedAgent}
                onChange={e => setSelectedAgent(e.target.value)}>
                <option value="">— Choose agent —</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} — Zone: {a.agentProfile?.zone?.name} {a.agentProfile?.isAvailable ? '(Available)' : '(Busy)'}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setAssignModal(null)}>Cancel</button>
              <button id="confirm-manual-assign" className="btn btn-primary" onClick={handleManualAssign}
                disabled={!selectedAgent || actionLoading}>
                {actionLoading ? <span className="spinner" /> : 'Assign Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Override Modal */}
      {statusModal && (
        <div className="modal-overlay" onClick={() => setStatusModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Override Order Status</h3>
            <div className="form-group">
              <label className="form-label">New Status</label>
              <select className="form-select" id="override-status-select" value={overrideStatus}
                onChange={e => setOverrideStatus(e.target.value)}>
                <option value="">— Select status —</option>
                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <textarea className="form-textarea" id="override-note" placeholder="Reason for override..."
                value={overrideNote} onChange={e => setOverrideNote(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setStatusModal(null)}>Cancel</button>
              <button id="confirm-override" className="btn btn-danger" onClick={handleStatusOverride}
                disabled={!overrideStatus || actionLoading}>
                {actionLoading ? <span className="spinner" /> : 'Override Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
