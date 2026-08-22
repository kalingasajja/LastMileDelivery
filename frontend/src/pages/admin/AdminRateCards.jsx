import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatCurrency, getErrorMsg } from '../../lib/utils.jsx';

export default function AdminRateCards() {
  const [rateCards, setRateCards] = useState([]);
  const [zones, setZones] = useState([]);
  const [codSurcharges, setCodSurcharges] = useState([]);
  const [form, setForm] = useState({ zoneFromId: '', zoneToId: '', orderType: 'B2C', ratePerKg: '', minCharge: '' });
  const [codForm, setCodForm] = useState({ B2B: '', B2C: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAll = () => {
    Promise.all([
      api.get('/rate-cards'),
      api.get('/zones'),
      api.get('/cod-surcharges')
    ]).then(([rc, z, cod]) => {
      setRateCards(rc.data);
      setZones(z.data);
      const codMap = {};
      cod.data.forEach(c => { codMap[c.orderType] = c.surchargeFlat; });
      setCodForm({ B2B: codMap.B2B || '', B2C: codMap.B2C || '' });
    });
  };

  useEffect(() => { fetchAll(); }, []);

  const addRateCard = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.post('/rate-cards', {
        ...form,
        ratePerKg: parseFloat(form.ratePerKg),
        minCharge: parseFloat(form.minCharge || '0')
      });
      setSuccess('Rate card created');
      setForm({ zoneFromId: '', zoneToId: '', orderType: 'B2C', ratePerKg: '', minCharge: '' });
      fetchAll();
    } catch (err) { setError(getErrorMsg(err)); }
  };

  const deleteCard = async (id) => {
    try { await api.delete(`/rate-cards/${id}`); fetchAll(); }
    catch (err) { setError(getErrorMsg(err)); }
  };

  const saveCodSurcharge = async (orderType) => {
    setError(''); setSuccess('');
    try {
      await api.put(`/cod-surcharges/${orderType}`, { surchargeFlat: parseFloat(codForm[orderType]) });
      setSuccess(`COD surcharge for ${orderType} updated`);
    } catch (err) { setError(getErrorMsg(err)); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Rate Cards</h1>
        <p className="page-subtitle">Configure per-kg rates for each zone pair and order type</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24 }}>
        <div>
          {/* Add Rate Card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><h3 className="card-title">Add Rate Card</h3></div>
            <form onSubmit={addRateCard}>
              <div className="form-group">
                <label className="form-label">From Zone</label>
                <select className="form-select" id="rate-from-zone" value={form.zoneFromId}
                  onChange={e => setForm({ ...form, zoneFromId: e.target.value })} required>
                  <option value="">— Select zone —</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">To Zone</label>
                <select className="form-select" id="rate-to-zone" value={form.zoneToId}
                  onChange={e => setForm({ ...form, zoneToId: e.target.value })} required>
                  <option value="">— Select zone —</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Order Type</label>
                <select className="form-select" id="rate-order-type" value={form.orderType}
                  onChange={e => setForm({ ...form, orderType: e.target.value })}>
                  <option value="B2C">B2C</option>
                  <option value="B2B">B2B</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Rate/kg (₹)</label>
                  <input className="form-input" id="rate-per-kg" type="number" step="0.01" min="0"
                    value={form.ratePerKg} onChange={e => setForm({ ...form, ratePerKg: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Charge (₹)</label>
                  <input className="form-input" id="rate-min-charge" type="number" step="0.01" min="0"
                    value={form.minCharge} onChange={e => setForm({ ...form, minCharge: e.target.value })} />
                </div>
              </div>
              <button id="add-rate-btn" type="submit" className="btn btn-primary w-full">Add Rate Card</button>
            </form>
          </div>

          {/* COD Surcharges */}
          <div className="card">
            <div className="card-header"><h3 className="card-title">COD Surcharges</h3></div>
            {['B2B', 'B2C'].map(type => (
              <div key={type} style={{ marginBottom: 16 }}>
                <label className="form-label">{type} COD Flat Surcharge (₹)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" id={`cod-${type}`} type="number" step="0.01" min="0"
                    value={codForm[type]} onChange={e => setCodForm({ ...codForm, [type]: e.target.value })} />
                  <button className="btn btn-secondary btn-sm" id={`save-cod-${type}`}
                    onClick={() => saveCodSurcharge(type)}>Save</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rate Cards Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Configured Rates ({rateCards.length})</h3>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>From Zone</th>
                  <th>To Zone</th>
                  <th>Type</th>
                  <th>Rate/kg</th>
                  <th>Min Charge</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rateCards.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No rate cards configured</td></tr>
                ) : rateCards.map(card => (
                  <tr key={card.id}>
                    <td>{card.zoneFrom?.name}</td>
                    <td>{card.zoneTo?.name} {card.zoneFromId === card.zoneToId && <span style={{ color: 'var(--accent)', fontSize: 11 }}>(Intra)</span>}</td>
                    <td><span className={`badge badge-${card.orderType === 'B2B' ? 'agent_assigned' : 'picked_up'}`}>{card.orderType}</span></td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(card.ratePerKg)}</td>
                    <td>{formatCurrency(card.minCharge)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => deleteCard(card.id)}
                        style={{ color: 'var(--danger)' }}>✕</button>
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
