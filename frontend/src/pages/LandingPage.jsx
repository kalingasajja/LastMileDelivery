import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Feature / Service data ───────────────────────────────── */
const services = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    title: 'Real-Time Tracking',
    desc: 'Track every shipment live — from pickup to doorstep. Your customers get instant updates at every milestone.',
    accent: '#6366f1',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
    title: 'Smart Dispatch',
    desc: 'Auto-assign orders to the nearest available agent using our intelligent zone-based routing engine.',
    accent: '#06b6d4',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    title: 'Dynamic Pricing',
    desc: 'Zone-based rate cards with volumetric weight billing. B2B and B2C rates, COD surcharge support built in.',
    accent: '#10b981',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: 'Multi-Role Access',
    desc: 'Separate dashboards for Admins, Agents and Customers — each with tailored tools and permissions.',
    accent: '#f59e0b',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: 'Live Analytics',
    desc: 'Dashboard overview with order status distribution, agent availability charts and KPIs at a glance.',
    accent: '#8b5cf6',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    title: 'Zone Management',
    desc: 'Map pincodes to delivery zones, configure coverage areas, and expand your service network in minutes.',
    accent: '#ef4444',
  },
];

const stats = [
  { value: '99.4%', label: 'On-Time Delivery' },
  { value: '< 2 min', label: 'Agent Assignment' },
  { value: 'Live', label: 'Order Tracking' },
  { value: 'Multi-Zone', label: 'Coverage Support' },
];

const steps = [
  { num: '01', title: 'Place an Order', desc: 'Enter pickup and delivery addresses, package dimensions and get an instant price quote.' },
  { num: '02', title: 'Smart Assignment', desc: 'Our engine auto-assigns the best available agent in the pickup zone within seconds.' },
  { num: '03', title: 'Track Live', desc: 'Real-time status updates from pickup through transit to successful doorstep delivery.' },
];

export default function LandingPage() {
  const { user } = useAuth();

  const dashboardLink =
    user?.role === 'ADMIN' ? '/admin' :
    user?.role === 'AGENT' ? '/agent' :
    user ? '/dashboard' : null;

  return (
    <div className="landing-root">

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <div className="landing-brand-icon">LM</div>
            <span>LastMile</span>
          </div>
          <div className="landing-nav-links">
            <a href="#services" className="landing-nav-link">Services</a>
            <a href="#how-it-works" className="landing-nav-link">How it Works</a>
            <a href="#stats" className="landing-nav-link">Why Us</a>
          </div>
          <div className="landing-nav-cta">
            {dashboardLink ? (
              <Link to={dashboardLink} className="btn btn-primary btn-sm">Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Log In</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Sign Up Free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
          <div className="hero-grid" />
        </div>

        <div className="hero-layout">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Intelligent Last-Mile Delivery Platform
            </div>

            <h1 className="hero-title">
              Deliver Smarter.<br />
              <span className="hero-title-gradient">Track Everything.</span>
            </h1>

            <p className="hero-subtitle">
              A complete delivery management platform — instant pricing, smart agent dispatch,
              real-time order tracking and multi-role dashboards. All in one place.
            </p>

            <div className="hero-actions">
              {dashboardLink ? (
                <Link to={dashboardLink} className="btn btn-primary btn-lg hero-btn-primary">
                  Go to Dashboard →
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg hero-btn-primary">
                    Get Started Free →
                  </Link>
                  <Link to="/login" className="btn btn-ghost btn-lg">
                    Sign In
                  </Link>
                </>
              )}
            </div>

            <div className="hero-trust">
              <div className="hero-trust-avatars">
                {['A','B','C','D'].map((l, i) => (
                  <div key={i} className="hero-avatar" style={{ background: ['#6366f1','#06b6d4','#10b981','#f59e0b'][i] }}>{l}</div>
                ))}
              </div>
              <span>Trusted by logistics teams worldwide</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-frame">
              <div className="hero-image-glow" />
              <img
                src="/hero_delivery.jpg"
                alt="LastMile delivery network"
                className="hero-image"
                onError={e => { e.currentTarget.parentElement.classList.add('hero-image-error'); }}
              />
              {/* CSS art fallback */}
              <div className="hero-css-art">
                <div className="css-art-track" />
                <div className="css-art-van">
                  <div className="css-art-van-body" />
                  <div className="css-art-van-wheel css-art-van-wheel-l" />
                  <div className="css-art-van-wheel css-art-van-wheel-r" />
                </div>
                {[0,1,2,3].map(i => (
                  <div key={i} className={`css-art-node css-art-node-${i}`} />
                ))}
                {[0,1,2].map(i => (
                  <div key={i} className={`css-art-pulse css-art-pulse-${i}`} />
                ))}
              </div>
            </div>

            {/* Floating stat cards */}
            <div className="hero-float-card hero-float-card-1">
              <div className="hfc-dot" style={{ background: '#10b981' }} />
              <div>
                <div className="hfc-val">347</div>
                <div className="hfc-label">Delivered Today</div>
              </div>
            </div>
            <div className="hero-float-card hero-float-card-2">
              <div className="hfc-dot" style={{ background: '#6366f1' }} />
              <div>
                <div className="hfc-val">1.3 min</div>
                <div className="hfc-label">Avg. Assignment</div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-scroll-indicator">
          <div className="hsi-inner" />
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────── */}
      <section className="stats-bar-section" id="stats">
        <div className="stats-bar-inner">
          {stats.map((s, i) => (
            <div key={i} className="stats-bar-item">
              <div className="stats-bar-value">{s.value}</div>
              <div className="stats-bar-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICES ────────────────────────────────────────── */}
      <section className="landing-section" id="services">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <div className="landing-eyebrow">What We Offer</div>
            <h2 className="landing-section-title">Everything Your Delivery Operation Needs</h2>
            <p className="landing-section-subtitle">
              From order creation to final delivery — every step is covered with intelligent automation.
            </p>
          </div>

          <div className="services-grid">
            {services.map((svc, i) => (
              <div key={i} className="service-card">
                <div className="service-icon" style={{ color: svc.accent, background: `${svc.accent}1a`, boxShadow: `0 0 0 1px ${svc.accent}30` }}>
                  {svc.icon}
                </div>
                <h3 className="service-title">{svc.title}</h3>
                <p className="service-desc">{svc.desc}</p>
                <div className="service-line" style={{ background: `linear-gradient(90deg, ${svc.accent}, transparent)` }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section className="landing-section landing-section-alt" id="how-it-works">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <div className="landing-eyebrow">Process</div>
            <h2 className="landing-section-title">Delivery in Three Simple Steps</h2>
            <p className="landing-section-subtitle">
              Place an order, let the system assign an agent, and track it live — effortlessly.
            </p>
          </div>

          <div className="steps-row">
            {steps.map((step, i) => (
              <div key={i} className="step-card">
                <div className="step-num-wrap">
                  <div className="step-num">{step.num}</div>
                  {i < steps.length - 1 && <div className="step-connector" />}
                </div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────── */}
      <section className="cta-section">
        <div className="cta-orb cta-orb-1" />
        <div className="cta-orb cta-orb-2" />
        <div className="cta-inner">
          <h2 className="cta-title">Ready to Modernise Your Deliveries?</h2>
          <p className="cta-subtitle">
            Join teams already using LastMile to automate dispatch, delight customers and scale operations.
          </p>
          <div className="cta-actions">
            {dashboardLink ? (
              <Link to={dashboardLink} className="btn btn-primary btn-lg">Open Dashboard →</Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg cta-btn-main">Start for Free →</Link>
                <Link to="/login" className="btn btn-ghost btn-lg">Log In</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-brand-col">
            <div className="landing-brand">
              <div className="landing-brand-icon" style={{ width: 30, height: 30, fontSize: 11, borderRadius: 7 }}>LM</div>
              <span style={{ fontSize: 17, fontWeight: 700 }}>LastMile</span>
            </div>
            <p className="footer-tagline">Intelligent last-mile delivery, end-to-end.</p>
          </div>

          <div className="footer-links-wrap">
            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <a href="#services" className="footer-link">Services</a>
              <a href="#how-it-works" className="footer-link">How it Works</a>
              <a href="#stats" className="footer-link">Why Us</a>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Account</div>
              <Link to="/login" className="footer-link">Log In</Link>
              <Link to="/register" className="footer-link">Sign Up</Link>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Roles</div>
              <span className="footer-link-plain">Customer</span>
              <span className="footer-link-plain">Delivery Agent</span>
              <span className="footer-link-plain">Admin</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} LastMile Delivery. All rights reserved.</span>
          <span className="footer-sep">·</span>
          <span>Built for fast, reliable last-mile logistics.</span>
        </div>
      </footer>
    </div>
  );
}
