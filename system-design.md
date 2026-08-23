# System Design Write-Up: Last-Mile Delivery Tracker

## Overview

The Last-Mile Delivery Tracker platform manages configurable rate calculations, zone-based delivery routing, intelligent agent assignments, and immutable delivery lifecycles.

```mermaid
graph TD
    A[Customer Portal] --> B[JWT Auth Guard]
    C[Admin Dashboard] --> B
    D[Public Tracking Page] --> E[Order Service]

    B --> E
    E --> F[Rate Calculation Engine]
    E --> G[Zone Detection Service]
    E --> H[Auto Assignment Engine]
    E --> I[PostgreSQL Database]

    F --> I
    G --> I
    H --> I
    E --> J[Notification Service]
    J --> K[Nodemailer Email Service]
    J --> L[Fast2SMS SMS Service]
```

---

## 1. System Architecture & Component Interactions

The system adopts a modular REST architecture with a stateless API layer and an immutable relational data model.

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant API as Express API
    participant Zone as Zone Detector
    participant Rate as Rate Engine
    participant DB as PostgreSQL DB
    participant Agent as Auto Assign Service
    participant Notify as Notification System

    Customer->>API: POST /api/orders/calculate
    API->>Zone: Lookup Zone ID
    Zone->>DB: Query areas table
    DB-->>Zone: Return Zone IDs
    API->>Rate: Compute Volumetric Weight
    Rate->>DB: Fetch rateCard
    DB-->>Rate: Return Rate per KG
    Rate-->>API: Calculated Breakdown
    API-->>Customer: Return Charge Breakdown

    Customer->>API: POST /api/orders
    API->>DB: Create Order Record
    API->>Agent: Trigger Auto Assignment
    Agent->>DB: Query available agent
    DB-->>Agent: Assign Agent
    Agent->>DB: Append tracking history
    API->>Notify: Dispatch Notifications
    API-->>Customer: Order Created and Tracking Link
```

---

## 2. Rate Calculation Engine

The rate engine operates as a sequential pipeline without hardcoded business rules. All pricing attributes reside in the database.

```mermaid
graph LR
    A[Input Payload] --> B[Zone Resolution]
    B --> C[Weight Calculation]
    C --> D[Rate Card Lookup]
    D --> E[Base Charge Calculation]
    E --> F{Payment Type COD}
    F -->|Yes| G[Add COD Surcharge]
    F -->|No| H[Total Charge Computed]
    G --> H
```

### Key Technical Aspects
- **Zone Detection**: Indexed lookup on pincodes via the `areas` table (O(1) query time).
- **Volumetric Weight**: Standard courier formula `(L × B × H) / 5000`. Billable weight is `MAX(actual_weight, volumetric_weight)`.
- **Rate Card Selection**: Deterministic database lookup using the composite key `(zone_from_id, zone_to_id, order_type)`.
- **COD Surcharge**: Applied per order type (`B2B` vs `B2C`) when payment type is `COD`.

---

## 3. Intelligent Auto-Assignment Logic

Agent assignment operates through an atomic database transaction using a 2-tier fallback model.

```mermaid
graph TD
    Start[Order Created] --> QueryPickup[Query Agent in Pickup Zone]
    QueryPickup --> FoundPickup{Agent Available}
    FoundPickup -->|Yes| AssignAgent[Assign Agent]
    FoundPickup -->|No| QueryGlobal[Query System Wide Agent]
    QueryGlobal --> FoundGlobal{Global Agent Available}
    FoundGlobal -->|Yes| AssignAgent
    FoundGlobal -->|No| LeaveUnassigned[Keep Pending]
    
    AssignAgent --> T1[Update Order Status]
    T1 --> T2[Set Agent Available False]
    T2 --> T3[Append Tracking Log]
    T3 --> Finish[Notify Users]
```

---

## 4. Order Status Lifecycle & Immutable Audit History

All status transitions are tracked in an append-only `tracking_history` table. Existing tracking entries are never updated or deleted.

```mermaid
stateDiagram-v2
    [*] --> CREATED
    CREATED --> AGENT_ASSIGNED
    AGENT_ASSIGNED --> PICKED_UP
    PICKED_UP --> IN_TRANSIT
    IN_TRANSIT --> OUT_FOR_DELIVERY
    OUT_FOR_DELIVERY --> DELIVERED
    OUT_FOR_DELIVERY --> FAILED
    FAILED --> RESCHEDULED
    RESCHEDULED --> AGENT_ASSIGNED
    CREATED --> CANCELLED
    AGENT_ASSIGNED --> CANCELLED
    DELIVERED --> [*]
    CANCELLED --> [*]
```

### Immutable Tracking Record Schema
Each transition appends a record with:
- `order_id`: Target order identifier.
- `status`: New lifecycle state.
- `changed_by_role`: Actor role (`CUSTOMER`, `AGENT`, `ADMIN`, `SYSTEM`).
- `note`: Operational log or reason for failure/reschedule.
- `timestamp`: Server-generated timestamp.

---

## 5. Technology Stack Summary

| Layer | Component | Description / Rationale |
|---|---|---|
| **Frontend** | React (Vite) | Single Page Application with real-time UI states |
| **Backend** | Node.js / Express | Modular REST API with role-based JWT auth |
| **Database** | PostgreSQL | ACID-compliant relational DB with foreign key constraints |
| **ORM** | Prisma ORM | Type-safe query engine with atomic transaction support |
| **Notifications** | Nodemailer & Fast2SMS | Non-blocking email and SMS dispatchers |
