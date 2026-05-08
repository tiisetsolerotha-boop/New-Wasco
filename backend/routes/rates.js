

const express = require('express');
const { pool: pgPool } = require('../db/postgres');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pgPool.query(
      `SELECT * FROM billing_rates WHERE is_current = TRUE ORDER BY tier`
    );
    res.json({ rates: rows });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch billing rates.' });
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { tier, min_units, max_units, cost_per_unit, description } = req.body;
  if (!tier || min_units === undefined || !cost_per_unit) {
    return res.status(400).json({ error: 'tier, min_units, and cost_per_unit are required.' });
  }
  try {
    const { rows } = await pgPool.query(
      `INSERT INTO billing_rates (tier, min_units, max_units, cost_per_unit, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tier, min_units, max_units || null, cost_per_unit, description || null]
    );
    res.status(201).json({ message: 'Rate tier added.', rate: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Could not add rate.' });
  }
});

router.patch('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { cost_per_unit, is_current } = req.body;
  try {
    const { rows } = await pgPool.query(
      `UPDATE billing_rates SET cost_per_unit = COALESCE($1, cost_per_unit), is_current = COALESCE($2, is_current)
       WHERE rate_id = $3 RETURNING *`,
      [cost_per_unit || null, is_current !== undefined ? is_current : null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Rate not found.' });
    res.json({ rate: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Could not update rate.' });
  }
});

module.exports = router;
