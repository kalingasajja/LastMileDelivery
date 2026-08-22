const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/zones — all users can view zones
router.get('/', requireAuth, async (req, res) => {
  try {
    const zones = await prisma.zone.findMany({
      include: { areas: true }
    });
    res.json(zones);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

// GET /api/zones/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const zone = await prisma.zone.findUnique({
      where: { id: req.params.id },
      include: { areas: true }
    });
    if (!zone) return res.status(404).json({ error: 'Zone not found' });
    res.json(zone);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch zone' });
  }
});

// POST /api/zones — admin only
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  [body('name').trim().notEmpty().withMessage('Zone name is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const zone = await prisma.zone.create({ data: { name: req.body.name } });
      res.status(201).json(zone);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Zone name already exists' });
      res.status(500).json({ error: 'Failed to create zone' });
    }
  }
);

// PUT /api/zones/:id — admin only
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  [body('name').trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const zone = await prisma.zone.update({
        where: { id: req.params.id },
        data: { name: req.body.name }
      });
      res.json(zone);
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Zone not found' });
      res.status(500).json({ error: 'Failed to update zone' });
    }
  }
);

// DELETE /api/zones/:id — admin only
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.zone.delete({ where: { id: req.params.id } });
    res.json({ message: 'Zone deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Zone not found' });
    res.status(500).json({ error: 'Failed to delete zone' });
  }
});

module.exports = router;
