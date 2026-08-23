require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const zoneRoutes = require('./routes/zone.routes');
const areaRoutes = require('./routes/area.routes');
const rateCardRoutes = require('./routes/rateCard.routes');
const codSurchargeRoutes = require('./routes/codSurcharge.routes');
const orderRoutes = require('./routes/order.routes');
const agentRoutes = require('./routes/agent.routes');

const app = express();

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/rate-cards', rateCardRoutes);
app.use('/api/cod-surcharges', codSurchargeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/agents', agentRoutes);

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 LastMile Delivery API server active on port ${PORT}`);
});
