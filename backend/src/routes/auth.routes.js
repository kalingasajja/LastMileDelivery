const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');

const router = express.Router();

// ── Helper: generate JWT ─────────────────────────────────────────
const signToken = (userId, role) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

// ── POST /api/auth/register ──────────────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
    body('phone').optional().isMobilePhone('any')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, phone } = req.body;

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { name, email, phone, passwordHash, role: 'CUSTOMER' },
        select: { id: true, name: true, email: true, phone: true, role: true }
      });

      const token = signToken(user.id, user.role);
      res.status(201).json({ user, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// ── POST /api/auth/login ─────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      const token = signToken(user.id, user.role);
      res.json({
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
        token
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// ── GET /api/auth/me ─────────────────────────────────────────────
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ── PATCH /api/auth/profile ──────────────────────────────────────
router.patch(
  '/profile',
  requireAuth,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('phone').optional().isMobilePhone('any')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, phone } = req.body;
    try {
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(name && { name }),
          ...(phone !== undefined && { phone })
        },
        select: { id: true, name: true, email: true, phone: true, role: true }
      });
      res.json({ user: updatedUser, message: 'Profile updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// ── GET /api/auth/customers — list/search customers (admin only) ────
router.get('/customers', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { q } = req.query;
  try {
    const where = { role: 'CUSTOMER' };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } }
      ];
    }
    const customers = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { name: 'asc' },
      take: 50
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// ── POST /api/auth/customers — create or return customer/guest account (admin only) ──
router.post(
  '/customers',
  requireAuth,
  requireRole('ADMIN'),
  [
    body('name').trim().notEmpty().withMessage('Customer name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('phone').optional().isMobilePhone('any'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 chars')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, phone, password } = req.body;

    try {
      // Check if customer already exists
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(200).json({
          user: { id: existing.id, name: existing.name, email: existing.email, phone: existing.phone, role: existing.role },
          isExisting: true,
          message: 'Existing customer found and selected'
        });
      }

      const rawPassword = password || 'Customer123!';
      const passwordHash = await bcrypt.hash(rawPassword, 12);

      const user = await prisma.user.create({
        data: { name, email, phone, passwordHash, role: 'CUSTOMER' },
        select: { id: true, name: true, email: true, phone: true, role: true }
      });

      res.status(201).json({ user, tempPassword: rawPassword, isExisting: false });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create guest/customer record' });
    }
  }
);

module.exports = router;
