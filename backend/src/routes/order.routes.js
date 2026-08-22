const express = require('express');
const { body, query, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { calculateCharge } = require('../services/rateEngine');
const { autoAssign, manualAssign } = require('../services/autoAssign');
const { notifyCustomer } = require('../services/notifier');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────
// POST /api/orders/calculate — charge preview (no order created)
// ─────────────────────────────────────────────────────────────────
router.post(
  '/calculate',
  requireAuth,
  [
    body('pickupPincode').trim().notEmpty().withMessage('Pickup pincode is required'),
    body('dropPincode').trim().notEmpty().withMessage('Drop pincode is required'),
    body('length').isFloat({ min: 0.1 }).withMessage('Length must be positive'),
    body('breadth').isFloat({ min: 0.1 }).withMessage('Breadth must be positive'),
    body('height').isFloat({ min: 0.1 }).withMessage('Height must be positive'),
    body('actualWeight').isFloat({ min: 0.01 }).withMessage('Actual weight must be positive'),
    body('orderType').isIn(['B2B', 'B2C']).withMessage('orderType must be B2B or B2C'),
    body('paymentType').isIn(['PREPAID', 'COD']).withMessage('paymentType must be PREPAID or COD'),
    body('rateType').optional().isIn(['STANDARD', 'EXPRESS', 'ECONOMY'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const breakdown = await calculateCharge(req.body);
      res.json({ breakdown });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// POST /api/orders — create order
// ─────────────────────────────────────────────────────────────────
router.post(
  '/',
  requireAuth,
  [
    body('pickupAddress').trim().notEmpty().withMessage('Pickup address required'),
    body('pickupPincode').trim().notEmpty().withMessage('Pickup pincode required'),
    body('dropAddress').trim().notEmpty().withMessage('Drop address required'),
    body('dropPincode').trim().notEmpty().withMessage('Drop pincode required'),
    body('length').isFloat({ min: 0.1 }),
    body('breadth').isFloat({ min: 0.1 }),
    body('height').isFloat({ min: 0.1 }),
    body('actualWeight').isFloat({ min: 0.01 }),
    body('orderType').isIn(['B2B', 'B2C']),
    body('paymentType').isIn(['PREPAID', 'COD']),
    body('rateType').optional().isIn(['STANDARD', 'EXPRESS', 'ECONOMY']),
    // Admin-only: create on behalf of customer
    body('customerId').optional().notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      pickupAddress, pickupPincode,
      dropAddress, dropPincode,
      length, breadth, height,
      actualWeight, orderType, paymentType, rateType,
      customerId // admin creating on behalf of customer
    } = req.body;

    // Determine actual customer
    let targetCustomerId = req.user.id;
    if (customerId) {
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admin can create orders on behalf of customers' });
      }
      targetCustomerId = customerId;
    }

    try {
      // Calculate charge using backend rate engine with selected rateType
      const breakdown = await calculateCharge({
        pickupPincode, dropPincode, length, breadth, height, actualWeight, orderType, paymentType, rateType
      });

      // Create order + first tracking entry in a transaction
      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            customerId: targetCustomerId,
            createdById: customerId ? req.user.id : null,
            pickupAddress,
            pickupPincode,
            dropAddress,
            dropPincode,
            pickupZoneId: breakdown.pickupZone.zoneId,
            dropZoneId: breakdown.dropZone.zoneId,
            length: parseFloat(length),
            breadth: parseFloat(breadth),
            height: parseFloat(height),
            actualWeight: parseFloat(actualWeight),
            volumetricWeight: breakdown.volumetricWeight,
            billableWeight: breakdown.billableWeight,
            orderType,
            paymentType,
            baseCharge: breakdown.baseCharge,
            codSurcharge: breakdown.codSurcharge,
            totalCharge: breakdown.totalCharge,
            status: 'CREATED'
          }
        });

        // Immutable first tracking entry
        await tx.trackingHistory.create({
          data: {
            orderId: newOrder.id,
            status: 'CREATED',
            changedById: req.user.id,
            changedByRole: req.user.role,
            note: 'Order placed'
          }
        });

        return newOrder;
      });

      // Fetch with relations for notification
      const fullOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { customer: { select: { name: true, email: true, phone: true } } }
      });

      // Notify (non-blocking)
      notifyCustomer(fullOrder, 'CREATED');

      res.status(201).json({ order, breakdown });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// GET /api/orders — list orders
// ─────────────────────────────────────────────────────────────────
router.get(
  '/',
  requireAuth,
  async (req, res) => {
    const { status, zoneId, agentId, customerId } = req.query;

    // Build filter based on role
    let where = {};
    if (req.user.role === 'CUSTOMER') {
      where.customerId = req.user.id;
    } else if (req.user.role === 'AGENT') {
      where.agentId = req.user.id;
    } else {
      // Admin — can filter by any field
      if (status) where.status = status;
      if (agentId) where.agentId = agentId;
      if (customerId) where.customerId = customerId;
      if (zoneId) {
        where.OR = [
          { pickupZoneId: zoneId },
          { dropZoneId: zoneId }
        ];
      }
    }

    try {
      const orders = await prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          agent: { select: { id: true, name: true } },
          pickupZone: { select: { id: true, name: true } },
          dropZone: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// GET /api/orders/:id — single order with full tracking timeline
// ─────────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        agent: { select: { id: true, name: true, phone: true } },
        pickupZone: { select: { id: true, name: true } },
        dropZone: { select: { id: true, name: true } },
        trackingHistory: {
          orderBy: { timestamp: 'asc' }
        },
        rescheduleRequests: { orderBy: { requestedAt: 'desc' } }
      }
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Access control
    if (req.user.role === 'CUSTOMER' && order.customerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'AGENT' && order.agentId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/orders/:id/track — PUBLIC tracking endpoint (no auth)
// Returns only tracking-safe fields — no customer PII exposed
// Used by the public /track/:id page linked from email notifications
// ─────────────────────────────────────────────────────────────────
router.get('/:id/track', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        status: true,
        orderType: true,
        paymentType: true,
        pickupPincode: true,
        dropPincode: true,
        scheduledDate: true,
        createdAt: true,
        updatedAt: true,
        pickupZone: { select: { name: true } },
        dropZone: { select: { name: true } },
        trackingHistory: {
          orderBy: { timestamp: 'asc' },
          select: {
            id: true, status: true,
            changedByRole: true, note: true, timestamp: true
          }
        }
      }
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tracking info' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/orders/:id/auto-assign — admin triggers auto-assignment
// ─────────────────────────────────────────────────────────────────
router.post('/:id/auto-assign', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!['CREATED', 'RESCHEDULED'].includes(order.status)) {
      return res.status(400).json({ error: `Cannot assign agent — order is in ${order.status} status` });
    }

    const result = await autoAssign(
      order.id,
      order.pickupZoneId,
      req.user.id,
      req.user.role
    );

    // Notify customer
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { customer: { select: { name: true, email: true, phone: true } } }
    });
    notifyCustomer(fullOrder, 'AGENT_ASSIGNED', `Agent: ${result.agentName}`);

    res.json({ message: 'Agent auto-assigned', ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/orders/:id/assign — admin manually assigns a specific agent
// ─────────────────────────────────────────────────────────────────
router.post(
  '/:id/assign',
  requireAuth,
  requireRole('ADMIN'),
  [body('agentId').notEmpty().withMessage('agentId required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const order = await prisma.order.findUnique({ where: { id: req.params.id } });
      if (!order) return res.status(404).json({ error: 'Order not found' });

      const result = await manualAssign(order.id, req.body.agentId, req.user.id, req.user.role);

      const fullOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { customer: { select: { name: true, email: true, phone: true } } }
      });
      notifyCustomer(fullOrder, 'AGENT_ASSIGNED', `Agent: ${result.agentName}`);

      res.json({ message: 'Agent manually assigned', ...result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// PATCH /api/orders/:id/status — agent or admin updates status
// ─────────────────────────────────────────────────────────────────

// Valid transitions per role
const AGENT_ALLOWED_STATUSES = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];
const ADMIN_ALLOWED_STATUSES = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED'];

router.patch(
  '/:id/status',
  requireAuth,
  requireRole('AGENT', 'ADMIN'),
  [
    body('status').notEmpty().withMessage('status is required'),
    body('note').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { status, note } = req.body;

    // Role-based status permission
    const allowed = req.user.role === 'ADMIN' ? ADMIN_ALLOWED_STATUSES : AGENT_ALLOWED_STATUSES;
    if (!allowed.includes(status)) {
      return res.status(403).json({ error: `Cannot set status to ${status}` });
    }

    try {
      const order = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: { customer: { select: { name: true, email: true, phone: true } } }
      });
      if (!order) return res.status(404).json({ error: 'Order not found' });

      // Agent can only update their own assigned orders
      if (req.user.role === 'AGENT' && order.agentId !== req.user.id) {
        return res.status(403).json({ error: 'You are not assigned to this order' });
      }

      // Atomic update + tracking history entry
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { status }
        }),
        prisma.trackingHistory.create({
          data: {
            orderId: order.id,
            status,
            changedById: req.user.id,
            changedByRole: req.user.role,
            note: note || null
          }
        })
      ]);

      // If DELIVERED — free up agent
      if (status === 'DELIVERED') {
        await prisma.agentProfile.updateMany({
          where: { userId: order.agentId },
          data: { isAvailable: true }
        });
      }

      // If FAILED — free up agent (reassignment needed for reschedule)
      if (status === 'FAILED') {
        await prisma.agentProfile.updateMany({
          where: { userId: order.agentId },
          data: { isAvailable: true }
        });
      }

      // Notify customer
      notifyCustomer(order, status, note);

      res.json({ message: `Order status updated to ${status}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update status' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// POST /api/orders/:id/reschedule — customer reschedules failed delivery
// ─────────────────────────────────────────────────────────────────
router.post(
  '/:id/reschedule',
  requireAuth,
  requireRole('CUSTOMER', 'ADMIN'),
  [body('newDate').isISO8601().withMessage('Valid ISO date required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const order = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: { customer: { select: { name: true, email: true, phone: true } } }
      });
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.status !== 'FAILED') {
        return res.status(400).json({ error: 'Only FAILED orders can be rescheduled' });
      }
      if (req.user.role === 'CUSTOMER' && order.customerId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const newDate = new Date(req.body.newDate);

      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { status: 'RESCHEDULED', scheduledDate: newDate, agentId: null }
        }),
        prisma.rescheduleRequest.create({
          data: { orderId: order.id, newDate }
        }),
        prisma.trackingHistory.create({
          data: {
            orderId: order.id,
            status: 'RESCHEDULED',
            changedById: req.user.id,
            changedByRole: req.user.role,
            note: `Rescheduled to ${newDate.toDateString()}`
          }
        })
      ]);

      notifyCustomer(order, 'RESCHEDULED', `New delivery date: ${newDate.toDateString()}`);

      res.json({ message: 'Order rescheduled. Admin will assign a new agent.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to reschedule order' });
    }
  }
);

module.exports = router;
