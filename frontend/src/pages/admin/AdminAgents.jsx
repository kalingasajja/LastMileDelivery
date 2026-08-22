import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { getErrorMsg } from '../../lib/utils.jsx';

export default function AdminAgents() {
  const [agents, setAgents] = useState([]);
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', zoneId: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAll = () => {
    Promise.all([api.get('/agents'), api.get('/zones')]).then(([ar, zr]) => {
      setAgents(ar.data); setZones(zr.data);
    });
  };

  useEffect(() => { fetchAll(); }, []);

  const createAgent = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await api.post('/agents', form);
      setSuccess(`Agent "${form.name}" created`);
      setForm({ name: '', email: '', password: '', phone: '', zoneId: '' });
      fetchAll();
    } catch (err) { setError(getErrorMsg(err)); }
    finally { setLoading(false); }
  };

  const toggleAvailability = async (agentId, current) => {
    try {
      await api.put(`/agents/${agentId}`, { isAvailable: !current });
      fetchAll();
    } catch (err) { setError(getErrorMsg(err)); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Delivery Agents</h1>
        <p className="page-subtitle">Create agents and manage their zone assignments</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24 }}>
        {/* Create Agent */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Create New Agent</h3></div>
          <form onSubmit={createAgent}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" id="agent-name" placeholder="Agent name"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" id="agent-email" type="email" placeholder="agent@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" id="agent-password" type="password" placeholder="Min 6 chars"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" id="agent-phone" type="tel" placeholder="9XXXXXXXXX"
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Assigned Zone</label>
              <select className="form-select" id="agent-zone" value={form.zoneId}
                onChange={e => setForm({ ...form, zoneId: e.target.value })} required>
                <option value="">— Select zone —</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <button id="create-agent-btn" type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Agent'}
            </button>
          </form>
        </div>

        {/* Agents List */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">All Agents ({agents.length})</h3></div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email / Phone</th>
                  <th>Zone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No agents yet</td></tr>
                ) : agents.map(agent => (
                  <tr key={agent.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{agent.name}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{agent.email}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{agent.phone || '—'}</div>
                    </td>
                    <td>{agent.agentProfile?.zone?.name || '—'}</td>
                    <td>
                      <span className={`badge ${agent.agentProfile?.isAvailable ? 'badge-delivered' : 'badge-in_transit'}`}>
                        {agent.agentProfile?.isAvailable ? 'Available' : 'On Delivery'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => toggleAvailability(agent.id, agent.agentProfile?.isAvailable)}
                      >
                        {agent.agentProfile?.isAvailable ? 'Mark Busy' : 'Mark Available'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
