import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogoClick = () => {
    if (!user) return navigate('/login');
    if (user.role === 'ADMIN') navigate('/admin');
    else if (user.role === 'AGENT') navigate('/agent');
    else navigate('/dashboard');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
        <div className="brand-icon" style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.5px' }}>LM</div>
        <span>LastMile</span>
      </div>

      {user && (
        <div className="navbar-nav">
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
    </nav>
  );
}
