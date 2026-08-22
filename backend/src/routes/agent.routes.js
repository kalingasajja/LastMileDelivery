const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/agents — list all agents (admin only)
router.get('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const agents = await prisma.user.findMany({
      where: { role: 'AGENT' },
      select: {
        id: true, name: true, email: true, phone: true,
        agentProfile: {
          include: { zone: { select: { id: true, name: true } } }
        }
      }
    });
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// POST /api/agents — admin creates a new delivery agent account
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('phone').optional().isMobilePhone('any'),
    body('zoneId').notEmpty().withMessage('zoneId required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, phone, zoneId } = req.body;

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          name, email, phone, passwordHash,
          role: 'AGENT',
          agentProfile: {
            create: { zoneId, isAvailable: true }
          }
        },
        include: { agentProfile: true }
      });

      res.status(201).json({
        id: user.id, name: user.name, email: user.email,
        phone: user.phone, role: user.role, agentProfile: user.agentProfile
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create agent' });
    }
  }
);

// PUT /api/agents/:id — update agent zone or availability (admin only)
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    const { zoneId, isAvailable } = req.body;

    try {
      const agentProfile = await prisma.agentProfile.update({
        where: { userId: req.params.id },
        data: {
          ...(zoneId !== undefined && { zoneId }),
          ...(isAvailable !== undefined && { isAvailable })
        },
        include: { zone: true }
      });
      res.json(agentProfile);
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Agent profile not found' });
      res.status(500).json({ error: 'Failed to update agent' });
    }
  }
);

// PATCH /api/agents/availability — agent toggles their own availability
router.patch('/availability', requireAuth, requireRole('AGENT'), async (req, res) => {
  const { isAvailable } = req.body;

  try {
    const profile = await prisma.agentProfile.update({
      where: { userId: req.user.id },
      data: { isAvailable }
    });
    res.json({ message: `Availability set to ${isAvailable}`, profile });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// GET /api/agents/me — agent's own profile
router.get('/me', requireAuth, requireRole('AGENT'), async (req, res) => {
  try {
    const profile = await prisma.agentProfile.findUnique({
      where: { userId: req.user.id },
      include: { zone: true }
    });
    res.json({ user: req.user, profile });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
