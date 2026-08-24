import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [lastReadTime, setLastReadTime] = useState(localStorage.getItem('lastReadNotificationTime'));
  const [toasts, setToasts] = useState([]);
  
  const dropdownRef = useRef(null);
  const prevOrdersRef = useRef(null);

  const handleLogoClick = () => {
    if (!user) return navigate('/login');
    if (user.role === 'ADMIN') navigate('/admin');
    else if (user.role === 'AGENT') navigate('/agent');
    else navigate('/dashboard');
  };

  const triggerToast = (title, message, orderId) => {
    const toastId = Math.random().toString();
    setToasts(current => [...current, { id: toastId, title, message, orderId }]);
    setTimeout(() => {
      setToasts(current => current.filter(t => t.id !== toastId));
    }, 5000);
  };

  const fetchOrders = () => {
    if (!user) return;
    api.get('/orders')
      .then(res => {
        const newOrders = res.data;
        
        // Detect status changes to trigger in-app toast alerts
        if (prevOrdersRef.current) {
          const STATUS_LABELS = {
            CREATED: 'Order Created',
            AGENT_ASSIGNED: 'Agent Assigned',
            PICKED_UP: 'Package Picked Up',
            IN_TRANSIT: 'In Transit',
            OUT_FOR_DELIVERY: 'Out for Delivery',
            DELIVERED: 'Delivered 🎉',
            FAILED: 'Delivery Failed',
            RESCHEDULED: 'Rescheduled',
            CANCELLED: 'Cancelled'
          };
          
          newOrders.forEach(newOrder => {
            const oldOrder = prevOrdersRef.current.find(o => o.id === newOrder.id);
            if (oldOrder && oldOrder.status !== newOrder.status) {
              const label = STATUS_LABELS[newOrder.status] || newOrder.status;
              const shortId = newOrder.id.slice(-8).toUpperCase();
              
              let msg = `Order #${shortId} status updated to: ${label}`;
              if (newOrder.status === 'AGENT_ASSIGNED' && newOrder.agent) {
                msg = `Agent ${newOrder.agent.name} has been assigned to Order #${shortId}`;
              } else if (newOrder.status === 'DELIVERED') {
                msg = `🎉 Order #${shortId} has been successfully delivered!`;
              } else if (newOrder.status === 'FAILED') {
                msg = `⚠️ Delivery attempt failed for Order #${shortId}`;
              }
              
              triggerToast('Order Status Update', msg, newOrder.id);
            }
          });
        }
        
        prevOrdersRef.current = newOrders;
        setOrders(newOrders);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchOrders();
    // Poll orders list every 5 seconds for fast real-time status updates & toasts
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const compiled = [];
    const STATUS_LABELS = {
      CREATED: 'Order Created',
      AGENT_ASSIGNED: 'Agent Assigned',
      PICKED_UP: 'Package Picked Up',
      IN_TRANSIT: 'In Transit',
      OUT_FOR_DELIVERY: 'Out for Delivery',
      DELIVERED: 'Delivered 🎉',
      FAILED: 'Delivery Failed',
      RESCHEDULED: 'Rescheduled',
      CANCELLED: 'Cancelled'
    };

    orders.forEach(order => {
      (order.trackingHistory || []).forEach(history => {
        compiled.push({
          id: history.id,
          orderId: order.id,
          status: history.status,
          note: history.note,
          timestamp: new Date(history.timestamp),
          title: STATUS_LABELS[history.status] || history.status,
          shortOrderId: order.id.slice(-8).toUpperCase()
        });
      });
    });

    compiled.sort((a, b) => b.timestamp - a.timestamp);
    setNotifications(compiled);
  }, [orders]);

  const unreadCount = notifications.filter(n => !lastReadTime || n.timestamp > new Date(lastReadTime)).length;

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      const now = new Date().toISOString();
      localStorage.setItem('lastReadNotificationTime', now);
      setLastReadTime(now);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <nav className="navbar" style={{ position: 'relative' }}>
      <div className="navbar-brand" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
        <div className="brand-icon" style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.5px' }}>LM</div>
        <span>LastMile</span>
      </div>

      {user && (
        <div className="navbar-nav" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Notification Bell */}
          <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={toggleDropdown}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition)',
                position: 'relative'
              }}
              className="nav-link"
              title="Notifications"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--danger)',
                  border: '1.5px solid var(--bg-card)'
                }} />
              )}
            </button>

            {/* Notification Dropdown */}
            {isOpen && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 40,
                width: 320,
                maxHeight: 380,
                overflowY: 'auto',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 1000,
                padding: '8px 0'
              }}>
                <div style={{
                  padding: '8px 16px',
                  fontWeight: 700,
                  fontSize: 13,
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Recent Activity</span>
                  {unreadCount > 0 && (
                    <span className="badge badge-primary" style={{ fontSize: 10, padding: '2px 6px', background: 'var(--primary)', color: 'white' }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>
                
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No recent activities
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setIsOpen(false);
                          if (user.role === 'CUSTOMER') {
                            navigate(`/orders/${n.orderId}`);
                          } else if (user.role === 'AGENT') {
                            navigate(`/agent`);
                          } else {
                            navigate(`/admin`);
                          }
                        }}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                        className="nav-link"
                      >
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                          Order <strong style={{ color: 'var(--primary-light)' }}>#{n.shortOrderId}</strong>: {n.title}
                        </div>
                        {n.note && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                            "{n.note}"
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                          {formatTime(n.timestamp)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius)',
              transition: 'var(--transition)'
            }}
            className="nav-link"
            title="View Profile Details"
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: 'white'
            }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.role}</div>
            </div>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={logout} style={{ marginLeft: 6 }}>Logout</button>
        </div>
      )}

      {/* Floating In-App Toast Container */}
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none'
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => {
              if (user.role === 'CUSTOMER') {
                navigate(`/orders/${toast.orderId}`);
              }
              setToasts(current => current.filter(t => t.id !== toast.id));
            }}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 18px',
              width: 300,
              boxShadow: 'var(--shadow-lg)',
              cursor: 'pointer',
              color: 'white',
              animation: 'slideUp 0.25s ease'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-light)' }} />
              {toast.title}
            </div>
            <div style={{ fontSize: 11, marginTop: 4, color: 'rgba(255,255,255,0.85)' }}>
              {toast.message}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
