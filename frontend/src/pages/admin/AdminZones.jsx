import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { getErrorMsg } from '../../lib/utils.jsx';

export default function AdminZones() {
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [newZone, setNewZone] = useState('');
  const [newArea, setNewArea] = useState({ name: '', pincode: '', zoneId: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAll = () => {
    Promise.all([api.get('/zones'), api.get('/areas')]).then(([zr, ar]) => {
      setZones(zr.data); setAreas(ar.data);
    });
  };

  useEffect(() => { fetchAll(); }, []);

  const addZone = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.post('/zones', { name: newZone });
      setSuccess(`Zone "${newZone}" created`);
      setNewZone('');
      fetchAll();
    } catch (err) { setError(getErrorMsg(err)); }
  };

  const deleteZone = async (id, name) => {
    if (!confirm(`Delete zone "${name}"? All associated areas will also be removed.`)) return;
    try {
      await api.delete(`/zones/${id}`);
      fetchAll();
    } catch (err) { setError(getErrorMsg(err)); }
  };

  const addArea = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.post('/areas', newArea);
      setSuccess(`Area "${newArea.name}" mapped to pincode ${newArea.pincode}`);
      setNewArea({ name: '', pincode: '', zoneId: '' });
      fetchAll();
    } catch (err) { setError(getErrorMsg(err)); }
  };

  const deleteArea = async (id) => {
    try {
      await api.delete(`/areas/${id}`);
      fetchAll();
    } catch (err) { setError(getErrorMsg(err)); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Zones & Areas</h1>
        <p className="page-subtitle">Configure delivery zones and map pincodes to zones</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Zones */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><h3 className="card-title">Add Zone</h3></div>
            <form onSubmit={addZone} style={{ display: 'flex', gap: 12 }}>
              <input id="new-zone-name" className="form-input" placeholder="Zone name (e.g. North Mumbai)"
                value={newZone} onChange={e => setNewZone(e.target.value)} required />
              <button id="add-zone-btn" type="submit" className="btn btn-primary">Add</button>
            </form>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">Zones ({zones.length})</h3></div>
            {zones.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}><p>No zones yet</p></div>
            ) : zones.map(zone => (
              <div key={zone.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{zone.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{zone.areas?.length || 0} areas</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => deleteZone(zone.id, zone.name)}
                  style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Areas */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><h3 className="card-title">Map Pincode → Zone</h3></div>
            <form onSubmit={addArea}>
              <div className="form-group">
                <label className="form-label">Area Name</label>
                <input id="new-area-name" className="form-input" placeholder="e.g. Borivali West"
                  value={newArea.name} onChange={e => setNewArea({ ...newArea, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input id="new-area-pincode" className="form-input" placeholder="6-digit pincode"
                  value={newArea.pincode} onChange={e => setNewArea({ ...newArea, pincode: e.target.value })}
                  maxLength={6} required />
              </div>
              <div className="form-group">
                <label className="form-label">Zone</label>
                <select id="new-area-zone" className="form-select"
                  value={newArea.zoneId} onChange={e => setNewArea({ ...newArea, zoneId: e.target.value })} required>
                  <option value="">— Select zone —</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <button id="add-area-btn" type="submit" className="btn btn-primary w-full">Map Pincode</button>
            </form>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">Mapped Areas ({areas.length})</h3></div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {areas.map(area => (
                <div key={area.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{area.pincode}</span>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>{area.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 8, background: 'rgba(6,182,212,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                      {area.zone?.name}
                    </span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteArea(area.id)}
                    style={{ color: 'var(--danger)', fontSize: 11 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
