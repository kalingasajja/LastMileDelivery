const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/cod-surcharges
router.get('/', requireAuth, async (req, res) => {
  try {
    const surcharges = await prisma.codSurcharge.findMany();
    res.json(surcharges);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch COD surcharges' });
  }
});

// PUT /api/cod-surcharges/:orderType — upsert for B2B or B2C (admin only)
router.put(
  '/:orderType',
  requireAuth,
  requireRole('ADMIN'),
  [
    body('surchargeFlat').isFloat({ min: 0 }).withMessage('surchargeFlat must be >= 0')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { orderType } = req.params;
    if (!['B2B', 'B2C'].includes(orderType)) {
      return res.status(400).json({ error: 'orderType must be B2B or B2C' });
    }

    try {
      const surcharge = await prisma.codSurcharge.upsert({
        where: { orderType },
        update: { surchargeFlat: req.body.surchargeFlat },
        create: { orderType, surchargeFlat: req.body.surchargeFlat }
      });
      res.json(surcharge);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update COD surcharge' });
    }
  }
);

module.exports = router;
