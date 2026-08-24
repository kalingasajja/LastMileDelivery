import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { StatusBadge, STATUS_META, formatCurrency, formatDate, shortId, getErrorMsg } from '../../lib/utils.jsx';
import Navbar from '../../components/Navbar.jsx';

export default function OrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchOrder = () => {
    api.get(`/orders/${id}`)
      .then(res => setOrder(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleReschedule = async () => {
    if (!rescheduleDate) return;
    setError(''); setSuccess('');
    setRescheduleLoading(true);
    try {
      await api.post(`/orders/${id}/reschedule`, { newDate: rescheduleDate });
      setSuccess('Order rescheduled! Admin will assign a new agent shortly.');
      fetchOrder();
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setRescheduleLoading(false);
    }
  };

  if (loading) return (
    <>
      <Navbar />
      <div className="loading-page"><span className="spinner" style={{ width: 40, height: 40 }} /><span>Loading order...</span></div>
    </>
  );

  if (!order) return (
    <>
      <Navbar />
      <div className="page-wrapper"><div className="alert alert-error">Order not found.</div></div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="page-wrapper">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>← Back</button>
            <h1 className="page-title">Order {shortId(order.id)}</h1>
            <StatusBadge status={order.status} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary-light)' }}>{formatCurrency(order.totalCharge)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Charge</div>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          {/* Left: Tracking + Details */}
          <div>
            {/* Tracking Timeline */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <h3 className="card-title">Tracking Timeline</h3>
              </div>
              <div className="timeline">
                {order.trackingHistory.map((entry, i) => {
                  const meta = STATUS_META[entry.status] || { icon: '?', color: 'created' };
                  const isLast = i === order.trackingHistory.length - 1;
                  return (
                    <div className="timeline-item" key={entry.id}>
                      <div className="timeline-dot" style={{
                        background: isLast ? 'var(--primary)' : 'var(--bg-elevated)',
                        border: `2px solid ${isLast ? 'var(--primary)' : 'var(--border)'}`,
                        color: isLast ? 'white' : 'var(--text-secondary)'
                      }}>
                        {meta.icon}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-status">{STATUS_META[entry.status]?.label || entry.status}</div>
                        <div className="timeline-time">{formatDate(entry.timestamp)}</div>
                        {entry.note && <div className="timeline-note">{entry.note}</div>}
                        {entry.changedByRole && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            Updated by: {entry.changedByRole}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reschedule (only if FAILED and customer owns it) */}
            {order.status === 'FAILED' && (user?.role === 'CUSTOMER' || user?.role === 'ADMIN') && (
              <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                <div className="card-header">
                  <h3 className="card-title">Reschedule Delivery</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                  Your delivery attempt failed. Choose a new date for redelivery.
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    id="reschedule-date"
                    type="date"
                    className="form-input"
                    value={rescheduleDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setRescheduleDate(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    id="reschedule-btn"
                    className="btn btn-primary"
                    onClick={handleReschedule}
                    disabled={!rescheduleDate || rescheduleLoading}
                  >
                    {rescheduleLoading ? <span className="spinner" /> : 'Reschedule'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Order Info */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
                Addresses
              </h4>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pickup</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 3 }}>{order.pickupAddress}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pincode: {order.pickupPincode} · Zone: {order.pickupZone?.name || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Drop</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 3 }}>{order.dropAddress}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pincode: {order.dropPincode} · Zone: {order.dropZone?.name || '—'}</div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
                Package
              </h4>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
                <div>Dimensions: {order.length}×{order.breadth}×{order.height} cm</div>
                <div>Actual Weight: <strong>{order.actualWeight} kg</strong></div>
                <div>Volumetric Weight: <strong>{order.volumetricWeight} kg</strong></div>
                <div>Billable Weight: <strong style={{ color: 'var(--primary-light)' }}>{order.billableWeight} kg</strong></div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
                Charges
              </h4>
              <div className="charge-box" style={{ padding: '12px 0', background: 'transparent', border: 'none', margin: 0 }}>
                <div className="charge-row"><span>Base charge</span><span className="charge-value">{formatCurrency(order.baseCharge)}</span></div>
                {order.codSurcharge > 0 && <div className="charge-row"><span>COD surcharge</span><span className="charge-value">{formatCurrency(order.codSurcharge)}</span></div>}
                <div className="charge-row total"><span>Total</span><span style={{ color: 'var(--primary-light)' }}>{formatCurrency(order.totalCharge)}</span></div>
              </div>
            </div>

            {order.scheduledDate && (
              <div className="card" style={{ marginBottom: 16 }}>
                <h4 style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
                  Delivery Schedule
                </h4>
                <div style={{ fontSize: 14 }}>
                  <div style={{ fontWeight: 600, color: 'var(--primary-light)' }}>
                    {formatDate(order.scheduledDate)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {order.status === 'RESCHEDULED' ? 'Rescheduled by Customer' : 'Estimated Delivery Time'}
                  </div>
                </div>
              </div>
            )}

            {order.agent && (
              <div className="card">
                <h4 style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
                  Delivery Agent
                </h4>
                <div style={{ fontSize: 14 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.agent.name}</div>
                  {order.agent.phone && <div style={{ color: 'var(--text-muted)' }}>{order.agent.phone}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
