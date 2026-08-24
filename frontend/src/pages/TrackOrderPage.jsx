import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { StatusBadge, STATUS_META, formatDate, shortId } from '../lib/utils.jsx';

export default function TrackOrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchTrack = () => {
      api.get(`/orders/${id}/track`)
        .then(res => setOrder(res.data))
        .catch(err => {
          if (err?.response?.status === 404) setNotFound(true);
        })
        .finally(() => setLoading(false));
    };

    fetchTrack();
    const interval = setInterval(fetchTrack, 5000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div style={{ textAlign: 'center' }}>
        <span className="spinner" style={{ width: 40, height: 40 }} />
        <div style={{ color: 'var(--text-muted)', marginTop: 12 }}>Loading tracking info...</div>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}></div>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Order Not Found</h2>
        <p style={{ color: 'var(--text-muted)' }}>The tracking link may be invalid or expired.</p>
        <Link to="/login" style={{ display: 'inline-block', marginTop: 20 }} className="btn btn-primary">
          Login to Your Account →
        </Link>
      </div>
    </div>
  );

  const currentStatusMeta = STATUS_META[order.status] || { icon: '?', label: order.status };
  const isTerminal = ['DELIVERED', 'CANCELLED'].includes(order.status);
  const isFailed = order.status === 'FAILED';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 60px' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #1e40af 100%)',
        padding: '24px 0',
        marginBottom: 32
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
            LastMile Delivery Tracker
          </div>
          <h1 style={{ color: 'white', margin: 0, fontSize: 24, fontWeight: 700 }}>
            Order {shortId(order.id)}
          </h1>
          <div style={{ marginTop: 10 }}>
            <StatusBadge status={order.status} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px' }}>

        {/* ── Current Status Card ─────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24, borderColor: isTerminal ? 'rgba(16,185,129,0.3)' : isFailed ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: isTerminal ? 'rgba(16,185,129,0.15)' : isFailed ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26
            }}>
              {currentStatusMeta.icon}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {currentStatusMeta.label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                Last updated: {formatDate(order.updatedAt)}
              </div>
            </div>
          </div>

          {isFailed && (
            <div style={{
              marginTop: 16, padding: '12px 16px',
              background: 'rgba(239,68,68,0.08)',
              borderRadius: 'var(--radius)',
              border: '1px solid rgba(239,68,68,0.2)',
              fontSize: 14, color: 'var(--danger)'
            }}>
              Delivery attempt failed. Please login to reschedule a new delivery date.
            </div>
          )}

          {order.scheduledDate && (
            <div style={{
              marginTop: 16, padding: '12px 16px',
              background: order.status === 'RESCHEDULED' ? 'rgba(245,158,11,0.08)' : 'rgba(37,99,235,0.08)',
              borderRadius: 'var(--radius)',
              border: `1px solid ${order.status === 'RESCHEDULED' ? 'rgba(245,158,11,0.2)' : 'rgba(37,99,235,0.2)'}`,
              fontSize: 14, color: order.status === 'RESCHEDULED' ? '#f59e0b' : 'var(--primary)'
            }}>
              {order.status === 'RESCHEDULED' ? 'Rescheduled for: ' : 'Expected Delivery Time: '}
              <strong>{formatDate(order.scheduledDate)}</strong>
            </div>
          )}
        </div>

        {/* ── Route Info ──────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Pickup Zone</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{order.pickupZone?.name || order.pickupPincode}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PIN: {order.pickupPincode}</div>
            </div>
            <div style={{ fontSize: 24, color: 'var(--primary)', padding: '0 16px' }}>→</div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Delivery Zone</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{order.dropZone?.name || order.dropPincode}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PIN: {order.dropPincode}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {order.orderType} · {order.paymentType}
            </span>
          </div>
        </div>

        {/* ── Tracking Timeline ────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Tracking Timeline</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {order.trackingHistory.length} update{order.trackingHistory.length !== 1 ? 's' : ''}
            </span>
          </div>

          {order.trackingHistory.length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <p>No tracking updates yet</p>
            </div>
          ) : (
            <div className="timeline">
              {[...order.trackingHistory].reverse().map((entry, i) => {
                const meta = STATUS_META[entry.status] || { icon: '?', color: 'created' };
                const isLatest = i === 0;
                return (
                  <div className="timeline-item" key={entry.id}>
                    <div className="timeline-dot" style={{
                      background: isLatest ? 'var(--primary)' : 'var(--bg-elevated)',
                      border: `2px solid ${isLatest ? 'var(--primary)' : 'var(--border)'}`,
                      color: isLatest ? 'white' : 'var(--text-secondary)'
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
          )}
        </div>

        {/* ── Login CTA ────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>
            Have an account? Login to manage your order, reschedule deliveries, and view full details.
          </p>
          <Link to="/login" className="btn btn-primary">
            Login to Your Account →
          </Link>
        </div>
      </div>
    </div>
  );
}
