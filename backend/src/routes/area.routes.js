const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/areas — list all areas (optionally filter by zone)
router.get('/', requireAuth, async (req, res) => {
  const { zoneId } = req.query;
  try {
    const areas = await prisma.area.findMany({
      where: zoneId ? { zoneId } : undefined,
      include: { zone: { select: { id: true, name: true } } }
    });
    res.json(areas);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch areas' });
  }
});

// GET /api/areas/lookup/:pincode — public lookup (used by rate engine + zone preview)
router.get('/lookup/:pincode', async (req, res) => {
  try {
    const area = await prisma.area.findUnique({
      where: { pincode: req.params.pincode },
      include: { zone: true }
    });
    if (!area) return res.status(404).json({ error: `No zone found for pincode ${req.params.pincode}` });
    res.json(area);
  } catch (err) {
    res.status(500).json({ error: 'Lookup failed' });
  }
});

// POST /api/areas — admin only
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  [
    body('name').trim().notEmpty().withMessage('Area name is required'),
    body('pincode').trim().notEmpty().withMessage('Pincode is required'),
    body('zoneId').notEmpty().withMessage('Zone ID is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, pincode, zoneId } = req.body;
    try {
      const area = await prisma.area.create({ data: { name, pincode, zoneId } });
      res.status(201).json(area);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Pincode already mapped' });
      if (err.code === 'P2003') return res.status(400).json({ error: 'Zone not found' });
      res.status(500).json({ error: 'Failed to create area' });
    }
  }
);

// PUT /api/areas/:id — admin only
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  [
    body('name').optional().trim().notEmpty(),
    body('pincode').optional().trim().notEmpty(),
    body('zoneId').optional().notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const area = await prisma.area.update({
        where: { id: req.params.id },
        data: req.body
      });
      res.json(area);
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Area not found' });
      res.status(500).json({ error: 'Failed to update area' });
    }
  }
);

// DELETE /api/areas/:id — admin only
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.area.delete({ where: { id: req.params.id } });
    res.json({ message: 'Area deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Area not found' });
    res.status(500).json({ error: 'Failed to delete area' });
  }
});

module.exports = router;
