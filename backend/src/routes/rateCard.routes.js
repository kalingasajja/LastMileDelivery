const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/rate-cards
router.get('/', requireAuth, async (req, res) => {
  try {
    const cards = await prisma.rateCard.findMany({
      include: {
        zoneFrom: { select: { id: true, name: true } },
        zoneTo: { select: { id: true, name: true } }
      }
    });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rate cards' });
  }
});

// POST /api/rate-cards — admin only
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  [
    body('zoneFromId').notEmpty().withMessage('zoneFromId required'),
    body('zoneToId').notEmpty().withMessage('zoneToId required'),
    body('orderType').isIn(['B2B', 'B2C']).withMessage('orderType must be B2B or B2C'),
    body('ratePerKg').isFloat({ min: 0 }).withMessage('ratePerKg must be a positive number'),
    body('minCharge').optional().isFloat({ min: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { zoneFromId, zoneToId, orderType, ratePerKg, minCharge } = req.body;

    try {
      const card = await prisma.rateCard.create({
        data: { zoneFromId, zoneToId, orderType, ratePerKg, minCharge: minCharge || 0 }
      });
      res.status(201).json(card);
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'Rate card for this zone pair and order type already exists' });
      }
      res.status(500).json({ error: 'Failed to create rate card' });
    }
  }
);

// PUT /api/rate-cards/:id — admin only
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  [
    body('ratePerKg').optional().isFloat({ min: 0 }),
    body('minCharge').optional().isFloat({ min: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const card = await prisma.rateCard.update({
        where: { id: req.params.id },
        data: req.body
      });
      res.json(card);
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Rate card not found' });
      res.status(500).json({ error: 'Failed to update rate card' });
    }
  }
);

// DELETE /api/rate-cards/:id — admin only
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.rateCard.delete({ where: { id: req.params.id } });
    res.json({ message: 'Rate card deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Rate card not found' });
    res.status(500).json({ error: 'Failed to delete rate card' });
  }
});

module.exports = router;
