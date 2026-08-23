import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatCurrency, getErrorMsg } from '../../lib/utils.jsx';
import Navbar from '../../components/Navbar.jsx';

const initialForm = {
  pickupLine1: '', pickupArea: '', pickupCity: '', pickupPincode: '',
  dropLine1: '', dropArea: '', dropCity: '', dropPincode: '',
  length: '', breadth: '', height: '',
  actualWeight: '',
  orderType: 'B2C',
  paymentType: 'PREPAID'
};

// ── Moved OUTSIDE the parent component — fixes focus-loss bug ────
function ZoneBadge({ zone, loading }) {
  if (loading) return (
    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span className="spinner" style={{ width: 10, height: 10 }} /> Detecting...
    </span>
  );
  if (!zone) return null;
  if (zone === 'not_found') return (
    <span style={{ fontSize: 11, color: 'var(--danger)', marginLeft: 6 }}>Not in service area</span>
  );
  return (
    <span style={{
      fontSize: 11, marginLeft: 6,
      color: 'var(--success)',
      background: 'rgba(16,185,129,0.1)',
      padding: '1px 8px', borderRadius: 20,
      border: '1px solid rgba(16,185,129,0.3)'
    }}>
      {zone.name}
    </span>
  );
}

function buildAddress(line1, area, city) {
  return [line1, area, city].filter(Boolean).join(', ');
}

export default function PlaceOrderPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [breakdown, setBreakdown] = useState(null);
  const [selectedRateType, setSelectedRateType] = useState('STANDARD');
  const [calcLoading, setCalcLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const [pickupZone, setPickupZone] = useState(null);
  const [dropZone, setDropZone] = useState(null);
  const [pickupZoneLoading, setPickupZoneLoading] = useState(false);
  const [dropZoneLoading, setDropZoneLoading] = useState(false);

  const set = useCallback((field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    setBreakdown(null);
    if (field === 'pickupPincode') setPickupZone(null);
    if (field === 'dropPincode') setDropZone(null);
  }, []);

  const lookupZone = async (pincode, setter, loadingSetter) => {
    if (!pincode || pincode.length < 6) return;
    loadingSetter(true);
    try {
      const res = await api.get(`/areas/lookup/${pincode}`);
      setter({ name: res.data.zone?.name || res.data.name });
    } catch {
      setter('not_found');
    } finally {
      loadingSetter(false);
    }
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    setError('');
    setCalcLoading(true);
    try {
      const res = await api.post('/orders/calculate', {
        pickupAddress: buildAddress(form.pickupLine1, form.pickupArea, form.pickupCity),
        pickupPincode: form.pickupPincode,
        dropAddress: buildAddress(form.dropLine1, form.dropArea, form.dropCity),
        dropPincode: form.dropPincode,
        length: parseFloat(form.length),
        breadth: parseFloat(form.breadth),
        height: parseFloat(form.height),
        actualWeight: parseFloat(form.actualWeight),
        orderType: form.orderType,
        paymentType: form.paymentType,
        rateType: selectedRateType
      });
      setBreakdown(res.data.breakdown);
      setStep(2);
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setCalcLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError('');
    setOrderLoading(true);
    try {
      const res = await api.post('/orders', {
        pickupAddress: buildAddress(form.pickupLine1, form.pickupArea, form.pickupCity),
        pickupPincode: form.pickupPincode,
        dropAddress: buildAddress(form.dropLine1, form.dropArea, form.dropCity),
        dropPincode: form.dropPincode,
        length: parseFloat(form.length),
        breadth: parseFloat(form.breadth),
        height: parseFloat(form.height),
        actualWeight: parseFloat(form.actualWeight),
        orderType: form.orderType,
        paymentType: form.paymentType,
        rateType: selectedRateType
      });
      navigate(`/orders/${res.data.order.id}`, { state: { fresh: true } });
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setOrderLoading(false);
    }
  };

  const activeOption = breakdown?.options?.find(o => o.id === selectedRateType) || breakdown?.options?.[0] || breakdown;

  return (
    <>
      <Navbar />
      <div className="page-wrapper" style={{ maxWidth: 800 }}>
        <div className="page-header">
          <h1 className="page-title">Place a New Order</h1>
          <p className="page-subtitle">Calculate charges and schedule a last-mile pickup</p>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {['Shipment Details', 'Confirm & Place'].map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: step > i + 1 ? 'var(--success)' : step === i + 1 ? 'var(--primary)' : 'var(--bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: 'white'
              }}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 14, color: step === i + 1 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: step === i + 1 ? 600 : 400 }}>
                {label}
              </span>
              {i < 1 && <span style={{ color: 'var(--border-light)', margin: '0 4px' }}>→</span>}
            </div>
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* ── STEP 1: Form ─────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleCalculate}>

            {/* Pickup Address */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <h3 className="card-title">Pickup Address (Sender)</h3>
              </div>
              <div className="form-group">
                <label className="form-label">Address Line 1 *</label>
                <input className="form-input" id="pickup-line1"
                  placeholder="Flat / House No, Building Name, Street"
                  value={form.pickupLine1}
                  onChange={e => set('pickupLine1', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Area / Landmark
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 6 }}>optional</span>
                </label>
                <input className="form-input" id="pickup-area"
                  placeholder="Locality or nearby landmark"
                  value={form.pickupArea}
                  onChange={e => set('pickupArea', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input className="form-input" id="pickup-city"
                    placeholder="City"
                    value={form.pickupCity}
                    onChange={e => set('pickupCity', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                    Pincode *
                    <ZoneBadge zone={pickupZone} loading={pickupZoneLoading} />
                  </label>
                  <input className="form-input" id="pickup-pincode"
                    placeholder="6-digit pincode"
                    value={form.pickupPincode}
                    onChange={e => set('pickupPincode', e.target.value)}
                    onBlur={() => lookupZone(form.pickupPincode, setPickupZone, setPickupZoneLoading)}
                    maxLength={6} pattern="[0-9]{6}" required />
                </div>
              </div>
            </div>

            {/* Drop Address */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <h3 className="card-title">Delivery Address (Recipient)</h3>
              </div>
              <div className="form-group">
                <label className="form-label">Address Line 1 *</label>
                <input className="form-input" id="drop-line1"
                  placeholder="Flat / House No, Building Name, Street"
                  value={form.dropLine1}
                  onChange={e => set('dropLine1', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Area / Landmark
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 6 }}>optional</span>
                </label>
                <input className="form-input" id="drop-area"
                  placeholder="Locality or nearby landmark"
                  value={form.dropArea}
                  onChange={e => set('dropArea', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input className="form-input" id="drop-city"
                    placeholder="City"
                    value={form.dropCity}
                    onChange={e => set('dropCity', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                    Pincode *
                    <ZoneBadge zone={dropZone} loading={dropZoneLoading} />
                  </label>
                  <input className="form-input" id="drop-pincode"
                    placeholder="6-digit pincode"
                    value={form.dropPincode}
                    onChange={e => set('dropPincode', e.target.value)}
                    onBlur={() => lookupZone(form.dropPincode, setDropZone, setDropZoneLoading)}
                    maxLength={6} pattern="[0-9]{6}" required />
                </div>
              </div>
            </div>

            {/* Package Specs */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <h3 className="card-title">Package Dimensions & Weight</h3>
              </div>
              <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-muted)' }}>
                Volumetric weight = (L × B × H) ÷ 5000. Billed on whichever is higher — actual or volumetric.
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Length (cm) *</label>
                  <input className="form-input" id="pkg-length" type="number" step="0.1" min="0.1" placeholder="0"
                    value={form.length} onChange={e => set('length', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Breadth (cm) *</label>
                  <input className="form-input" id="pkg-breadth" type="number" step="0.1" min="0.1" placeholder="0"
                    value={form.breadth} onChange={e => set('breadth', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Height (cm) *</label>
                  <input className="form-input" id="pkg-height" type="number" step="0.1" min="0.1" placeholder="0"
                    value={form.height} onChange={e => set('height', e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Actual Weight (kg) *</label>
                <input className="form-input" id="pkg-weight" type="number" step="0.01" min="0.01" placeholder="0.00"
                  value={form.actualWeight} onChange={e => set('actualWeight', e.target.value)} required />
              </div>
            </div>

            {/* Order Options */}
            <div className="card" style={{ marginBottom: 28 }}>
              <div className="card-header">
                <h3 className="card-title">Order Options</h3>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Order Type</label>
                  <select className="form-select" id="order-type"
                    value={form.orderType} onChange={e => set('orderType', e.target.value)}>
                    <option value="B2C">B2C — Individual / Personal</option>
                    <option value="B2B">B2B — Business Shipment</option>
                  </select>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {form.orderType === 'B2C'
                      ? 'Personal parcels shipped to individual recipients.'
                      : 'Commercial shipments between businesses.'}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Type</label>
                  <select className="form-select" id="payment-type"
                    value={form.paymentType} onChange={e => set('paymentType', e.target.value)}>
                    <option value="PREPAID">Prepaid — Pay now</option>
                    <option value="COD">Cash on Delivery (COD)</option>
                  </select>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {form.paymentType === 'COD'
                      ? 'A COD surcharge will be added to the total charge.'
                      : 'Charge settled at time of booking.'}
                  </div>
                </div>
              </div>
            </div>

            <button id="calculate-btn" type="submit" className="btn btn-primary btn-lg w-full" disabled={calcLoading}>
              {calcLoading ? <><span className="spinner" /> Calculating charges...</> : 'Get Instant Quote'}
            </button>
          </form>
        )}

        {/* ── STEP 2: Confirm & Select Rate Tier ────────────────────────── */}
        {step === 2 && breakdown && (
          <div>
            {/* Rate Calculation Tier Selection Cards */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Choose Delivery Rate & Speed</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {breakdown.options?.map(option => {
                  const isSelected = option.id === selectedRateType;
                  return (
                    <div
                      key={option.id}
                      onClick={() => setSelectedRateType(option.id)}
                      style={{
                        background: isSelected ? 'var(--primary-faint)' : '#ffffff',
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-lg)',
                        padding: 16,
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        position: 'relative'
                      }}
                    >
                      {isSelected && (
                        <span style={{
                          position: 'absolute', top: 10, right: 10,
                          background: 'var(--primary)', color: 'white',
                          borderRadius: '50%', width: 20, height: 20,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800
                        }}>✓</span>
                      )}
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {option.id}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                        {option.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {option.subtitle} · <strong>{option.estimatedDelivery}</strong>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-dark)', marginTop: 12 }}>
                        {formatCurrency(option.totalCharge)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <h3 className="card-title">Charge Breakdown ({activeOption.title || selectedRateType})</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>← Edit Details</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Pickup Zone', value: breakdown.pickupZone.zoneName },
                  { label: 'Drop Zone', value: breakdown.dropZone.zoneName },
                  {
                    label: 'Pricing Calculation Method',
                    value: (
                      <span style={{ fontWeight: 600 }}>
                        {activeOption.pricingMethod === 'DISTANCE_EXPRESS' ? 'Express Distance Calculation' :
                         activeOption.pricingMethod === 'ECONOMY_SURFACE' ? 'Economy Bulk Calculation' :
                         breakdown.isIntraZone ? 'Intra-Zone Rate Card' : 'Inter-Zone Rate Card'}
                      </span>
                    )
                  },
                  {
                    label: 'Billable Weight',
                    value: (
                      <>{breakdown.billableWeight} kg
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                          (actual: {form.actualWeight} kg | vol: {breakdown.volumetricWeight} kg)
                        </span>
                      </>
                    )
                  }
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="charge-box">
                <div className="charge-row">
                  <span>Rate per kg ({form.orderType})</span>
                  <span className="charge-value">{formatCurrency(activeOption.ratePerKg)}/kg</span>
                </div>
                <div className="charge-row">
                  <span>Billable weight</span>
                  <span className="charge-value">{breakdown.billableWeight} kg</span>
                </div>
                {activeOption.minCharge > 0 && (
                  <div className="charge-row">
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Min. charge floor</span>
                    <span className="charge-value" style={{ color: 'var(--text-muted)', fontSize: 13 }}>{formatCurrency(activeOption.minCharge)}</span>
                  </div>
                )}
                <div className="charge-row">
                  <span>Base charge</span>
                  <span className="charge-value">{formatCurrency(activeOption.baseCharge)}</span>
                </div>
                {activeOption.codSurcharge > 0 && (
                  <div className="charge-row">
                    <span>COD surcharge</span>
                    <span className="charge-value">{formatCurrency(activeOption.codSurcharge)}</span>
                  </div>
                )}
                <div className="charge-row total">
                  <span>Total Charge ({activeOption.title || selectedRateType})</span>
                  <span style={{ color: 'var(--primary-dark)', fontSize: 22 }}>{formatCurrency(activeOption.totalCharge)}</span>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="card" style={{ marginBottom: 24, background: 'var(--primary-faint)', borderColor: 'rgba(37,99,235,0.2)' }}>
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: 14, fontSize: 14, fontWeight: 600 }}>Order Summary</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>PICKUP</div>
                  <div>{form.pickupLine1}</div>
                  {form.pickupArea && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{form.pickupArea}</div>}
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{form.pickupCity} — {form.pickupPincode}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>DELIVERY</div>
                  <div>{form.dropLine1}</div>
                  {form.dropArea && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{form.dropArea}</div>}
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{form.dropCity} — {form.dropPincode}</div>
                </div>
                <div><strong>Type:</strong> {form.orderType === 'B2C' ? 'B2C — Individual' : 'B2B — Business'}</div>
                <div><strong>Payment:</strong> {form.paymentType === 'COD' ? 'Cash on Delivery' : 'Prepaid'}</div>
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost btn-lg" onClick={() => setStep(1)} style={{ flex: 1 }}>← Back</button>
              <button
                id="confirm-order-btn"
                className="btn btn-primary btn-lg"
                style={{ flex: 2 }}
                onClick={handleConfirm}
                disabled={orderLoading}
              >
                {orderLoading ? <><span className="spinner" /> Placing order...</> : `Confirm & Place Order — ${formatCurrency(activeOption.totalCharge)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
