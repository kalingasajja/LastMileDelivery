# System Design Write-Up: Last-Mile Delivery Tracker

**Word count target: ~800 words**

---

## Overview

The Last-Mile Delivery Tracker is designed around four core technical challenges: a configurable rate calculation engine, zone-based delivery routing, intelligent agent assignment, and a reliable failed-delivery recovery flow. Each is addressed with deliberate design choices that prioritize correctness, admin flexibility, and data integrity.

---

## 1. Rate Calculation Engine

The rate engine is the most evaluation-critical component. The core design principle is **zero hardcoding** — every pricing variable lives in the database and is configurable by the admin without code changes.

The engine operates as a sequential pipeline:

**Zone Detection** happens first. Rather than relying on an external geocoding API (unreliable, paid, latency-heavy), we use a pincode-to-zone lookup table (`areas` table). Admins map 6-digit pincodes to named zones. This is simple, fast (a single indexed DB lookup per address), and fully admin-controlled. Customers enter their pincode, and the system resolves it instantly.

**Rate Card Selection** uses a composite key `(zone_from_id, zone_to_id, order_type)` in the `rate_cards` table. This single structure elegantly handles all four pricing dimensions: intra-zone vs. inter-zone (same key when `zone_from = zone_to`), and B2B vs. B2C (separate rows for the same zone pair). No conditional branching is needed in code — the DB lookup is deterministic.

**Volumetric Weight** is calculated as `(L × B × H) / 5000`, a standard courier industry formula. The billable weight is `MAX(actual_weight, volumetric_weight)` — ensuring large-volume, lightweight packages are correctly priced. Both values are stored immutably on the order record at creation time, preventing any retrospective disputes.

**COD Surcharge** is a flat fee per order type, stored in `cod_surcharges`. It's applied only when `payment_type = COD`. Admin can update this at any time without deployment.

The engine exposes a `/calculate` endpoint that returns the full breakdown (zones, volumetric weight, billable weight, rate used, COD surcharge) **before** the customer confirms. This preview step is critical for trust — the customer sees exactly what they pay and why.

---

## 2. Zone Detection Approach

Zone detection is pincode-based. The `areas` table stores `(pincode, area_name, zone_id)` with a unique index on `pincode`. Detection is a single O(1) indexed lookup — no geocoding, no external API calls, no latency.

The admin UI allows adding/editing pincode mappings at any time. New service areas are onboarded simply by adding pincode entries. This approach is pragmatic and production-ready for logistics companies in markets like India where pincode boundaries are well-understood operationally.

The alternative (full-address geocoding via OpenStreetMap or Google Maps) was deliberately rejected for this implementation: it introduces API rate limits, inconsistent address parsing, and external dependency. For a production system at scale, a hybrid approach could layer geocoding on top of pincode zones as a fallback.

---

## 3. Auto-Assignment Logic

Agent availability is modelled through the `agent_profiles` table: each agent has a `zone_id` (their operational zone) and an `is_available` boolean. This is a lightweight but effective model for the assignment scale of a last-mile platform.

The auto-assignment algorithm follows a two-tier preference system:

**Tier 1 (preferred):** Find any available agent whose `zone_id` matches the order's `pickup_zone_id`. This ensures local knowledge and minimizes dead-head distance.

**Tier 2 (fallback):** If no agent is available in the pickup zone, select any available agent in the system.

The assignment is executed in a **Prisma transaction** that atomically: (1) updates `order.agent_id` and `order.status` to `AGENT_ASSIGNED`, (2) sets `agent_profile.is_available = false`, and (3) appends an entry to `tracking_history`. The transaction guarantees no double-assignment race conditions.

When an order is `DELIVERED` or `FAILED`, the agent's availability is automatically restored, making them eligible for the next order. For rescheduled orders, the agent is cleared (`order.agent_id = null`), triggering a fresh assignment cycle.

---

## 4. Order Status Lifecycle and Immutable Tracking

The `tracking_history` table is **append-only** by design. Every status transition creates a new row with: the new status, the actor (user ID + role), an optional note, and a server-side timestamp. Existing rows are never updated or deleted.

This immutability serves multiple purposes: it provides a complete audit trail for disputes, it prevents any actor from retroactively falsifying delivery records, and it gives customers a rich, time-stamped journey view.

The status lifecycle enforces role-based permissions: agents can set `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, or `FAILED`. Admins can set any status including `CANCELLED`. Agents cannot update orders not assigned to them.

---

## 5. Failed Delivery Handling

When an agent marks an order as `FAILED`: the agent is freed (availability restored), the customer receives an email and SMS notification, and the order status moves to `FAILED`. The customer portal surfaces a reschedule widget.

On reschedule, a `reschedule_requests` record is created, the order transitions to `RESCHEDULED`, the `scheduled_date` is updated, and `agent_id` is cleared. The admin is then prompted (via the dashboard alert) to assign a new agent for the rescheduled attempt. The full original attempt is preserved in `tracking_history`, so the complete multi-attempt journey remains visible to all parties.

---

## Technology Choices

| Component | Choice | Rationale |
|---|---|---|
| ORM | Prisma | Type-safe queries, migrations, transaction support |
| Auth | JWT (stateless) | No session store needed, suitable for API |
| Notifications | Nodemailer + Fast2SMS | Free tier, non-blocking |
| DB | PostgreSQL | ACID transactions, relational integrity for rate cards |
