import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { StatusBadge, formatCurrency, formatDate, shortId } from '../../lib/utils.jsx';
import Navbar from '../../components/Navbar.jsx';

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders')
      .then(res => setOrders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: orders.length,
    active: orders.filter(o => !['DELIVERED', 'CANCELLED', 'FAILED'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
    failed: orders.filter(o => o.status === 'FAILED').length
  };

  return (
    <>
      <Navbar />
      <div className="page-wrapper">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Welcome back, {user?.name}!</h1>
            <p className="page-subtitle">Track and manage all your deliveries</p>
          </div>
          <button
            id="place-order-btn"
            className="btn btn-primary"
            onClick={() => navigate('/place-order')}
          >
            Place New Order
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.active}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Delivered</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.delivered}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Failed</div>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.failed}</div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">My Orders</h2>
          </div>
          {loading ? (
            <div className="loading-page" style={{ minHeight: 200 }}>
              <span className="spinner" style={{ width: 32, height: 32 }} />
              <span>Loading orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"></div>
              <h3>No orders yet</h3>
              <p>Place your first order to get started</p>
              <button className="btn btn-primary" onClick={() => navigate('/place-order')} style={{ marginTop: 16 }}>
                Place Order
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Pickup → Drop</th>
                    <th>Type</th>
                    <th>Payment</th>
                    <th>Charge</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr 
                      key={order.id} 
                      onClick={() => navigate(`/orders/${order.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{shortId(order.id)}</td>
                      <td>
                        <span style={{ fontSize: 13 }}>
                          {order.pickupPincode} → {order.dropPincode}
                        </span>
                      </td>
                      <td>{order.orderType}</td>
                      <td>{order.paymentType}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(order.totalCharge)}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td style={{ fontSize: 13 }}>{formatDate(order.createdAt)}</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation(); // prevent double navigation trigger
                            navigate(`/orders/${order.id}`);
                          }}
                        >
                          Track →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
