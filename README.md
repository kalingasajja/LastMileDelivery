# 🚚 Last-Mile Delivery Tracker

A full-stack delivery management platform with intelligent pricing, smart agent assignment, and real-time order tracking.

**Tech Stack:** React + Node.js + PostgreSQL + Prisma

---

## 📋 Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Setup Guide](#setup-guide)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Rate Calculation Logic](#rate-calculation-logic)
- [Environment Variables](#environment-variables)

---

## ✨ Features

### Customer
- Register, login, place orders
- Real-time charge preview before confirming
- Live order tracking with immutable status timeline
- Email + SMS notifications on every status change
- Reschedule failed deliveries

### Admin
- Manage zones and pincode-to-zone mappings
- Configure rate cards (B2B/B2C, intra/inter-zone)
- Set COD surcharges per order type
- View all orders with status/zone/agent filters
- Auto-assign or manually assign delivery agents
- Override any order status

### Delivery Agent
- View assigned orders
- Update delivery status (Picked Up → Delivered / Failed)
- Toggle availability

---

## 🏗️ Architecture

```
last-mile-delivery/
├── backend/              # Node.js + Express + Prisma
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── routes/       # Auth, orders, zones, areas, rate cards, agents
│   │   ├── services/
│   │   │   ├── rateEngine.js     # Core pricing engine
│   │   │   ├── zoneDetector.js   # Pincode → zone
│   │   │   ├── autoAssign.js     # Agent assignment logic
│   │   │   └── notifier.js       # Email + SMS
│   │   ├── middleware/
│   │   │   └── auth.middleware.js
│   │   └── index.js
│   └── .env.example
└── frontend/             # React + Vite
    └── src/
        ├── pages/
        │   ├── customer/  # Dashboard, PlaceOrder, OrderDetail
        │   ├── admin/     # Layout, Overview, Orders, Zones, RateCards, Agents
        │   └── agent/     # AgentDashboard
        ├── context/       # AuthContext
        └── lib/           # api.js, utils.jsx
```

---

## 🚀 Setup Guide

### Prerequisites
- Node.js >= 18
- PostgreSQL database (local or [Railway](https://railway.app))

### 1. Clone & Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Copy and fill in your values
cp backend/.env.example backend/.env
```

Required: `DATABASE_URL`, `JWT_SECRET`
Optional: `EMAIL_*` (Nodemailer), `FAST2SMS_API_KEY` (SMS)

### 3. Initialize Database

```bash
cd backend

# Run migrations
npx prisma migrate dev --name init

# Seed with sample data
node src/prisma/seed.js
```

### 4. Run

```bash
# Terminal 1 - Backend (port 5000)
cd backend
npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Default Credentials (after seed)
| Role | Email | Password |
|---|---|---|
| Admin | admin@lastmile.com | admin123 |
| Customer | customer@test.com | customer123 |
| Agent 1 | agent1@lastmile.com | agent123 |
| Agent 2 | agent2@lastmile.com | agent123 |

---

## 🗄️ Database Schema

```
users            → id, name, email, phone, password_hash, role (CUSTOMER|AGENT|ADMIN)
agent_profiles   → id, user_id, zone_id, is_available
zones            → id, name
areas            → id, name, pincode (UNIQUE), zone_id      ← zone detection key
rate_cards       → id, zone_from_id, zone_to_id, order_type (B2B|B2C), rate_per_kg, min_charge
                   UNIQUE(zone_from_id, zone_to_id, order_type)
cod_surcharges   → id, order_type (UNIQUE), surcharge_flat
orders           → id, customer_id, agent_id, pickup/drop address+pincode+zone,
                   length, breadth, height, actual_weight, volumetric_weight, billable_weight,
                   order_type, payment_type, base_charge, cod_surcharge, total_charge,
                   status, scheduled_date
tracking_history → id, order_id, status, changed_by_id, changed_by_role, note, timestamp
                   ← APPEND-ONLY, never modified
reschedule_requests → id, order_id, new_date, requested_at
```

---

## 📡 API Documentation

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | None | Register new customer |
| POST | /api/auth/login | None | Login (all roles) |
| GET | /api/auth/me | Bearer | Get current user |

### Orders
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/orders/calculate | Any | Preview charge (no order created) |
| POST | /api/orders | Any | Create order |
| GET | /api/orders | Any | List orders (role-filtered) |
| GET | /api/orders/:id | Any | Order detail + tracking history |
| POST | /api/orders/:id/auto-assign | Admin | Auto-assign nearest agent |
| POST | /api/orders/:id/assign | Admin | Manually assign agent |
| PATCH | /api/orders/:id/status | Agent/Admin | Update status (immutable log) |
| POST | /api/orders/:id/reschedule | Customer/Admin | Reschedule failed delivery |

### Zones & Areas
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/zones | Any | List all zones |
| POST | /api/zones | Admin | Create zone |
| PUT | /api/zones/:id | Admin | Update zone |
| DELETE | /api/zones/:id | Admin | Delete zone |
| GET | /api/areas | Any | List areas |
| GET | /api/areas/lookup/:pincode | Any | Resolve pincode to zone |
| POST | /api/areas | Admin | Map pincode to zone |

### Rate Cards & COD
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/rate-cards | Any | List rate cards |
| POST | /api/rate-cards | Admin | Create rate card |
| PUT | /api/rate-cards/:id | Admin | Update rate |
| DELETE | /api/rate-cards/:id | Admin | Delete rate card |
| GET | /api/cod-surcharges | Any | List COD surcharges |
| PUT | /api/cod-surcharges/:orderType | Admin | Upsert COD surcharge |

### Agents
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/agents | Admin | List all agents |
| POST | /api/agents | Admin | Create agent account |
| PUT | /api/agents/:id | Admin | Update agent zone/availability |
| PATCH | /api/agents/availability | Agent | Toggle own availability |
| GET | /api/agents/me | Agent | Agent's own profile |

---

## 💰 Rate Calculation Logic

The rate engine (`backend/src/services/rateEngine.js`) follows this pipeline:

```
INPUT: pickupPincode, dropPincode, L, B, H, actualWeight, orderType, paymentType

STEP 1: Pincode → Zone Detection
  areas table: WHERE pincode = pickupPincode → pickup_zone_id
  areas table: WHERE pincode = dropPincode   → drop_zone_id

STEP 2: Rate Card Lookup
  rate_cards: WHERE zone_from_id = pickup_zone AND zone_to_id = drop_zone AND order_type = B2B|B2C
  → Intra-zone if zone_from = zone_to (same rate card covers it)
  → Inter-zone if zone_from ≠ zone_to

STEP 3: Volumetric Weight
  volumetric_weight = (L × B × H) / 5000

STEP 4: Billable Weight
  billable_weight = MAX(actual_weight, volumetric_weight)

STEP 5: Base Charge
  raw_charge = billable_weight × rate_per_kg
  base_charge = MAX(raw_charge, min_charge)    ← respects minimum charge floor

STEP 6: COD Surcharge (if paymentType = COD)
  cod_surcharges: WHERE order_type = B2B|B2C → surcharge_flat

STEP 7: Total
  total_charge = base_charge + cod_surcharge
```

**Zero hardcoding** — all rates, minimums, and surcharges are read from DB and configurable by admin.

---

## 🔔 Notifications

- **Email**: Nodemailer (Gmail SMTP or any SMTP). HTML template with tracking link.
- **SMS**: Fast2SMS bulk API (India). Triggered on key events.
- Both are non-blocking and non-fatal — notification failure does not break order flow.

---

## ⚙️ Environment Variables

See `backend/.env.example`:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret"
JWT_EXPIRES_IN="7d"
PORT=5000

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your-app-password

# Fast2SMS (optional)
FAST2SMS_API_KEY=your-key

FRONTEND_URL=http://localhost:5173
```
