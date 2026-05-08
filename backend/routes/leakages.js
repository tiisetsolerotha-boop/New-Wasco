

const express = require('express');
const { pool: pgPool } = require('../db/postgres');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  const { location, district, description, priority } = req.body;
  if (!location) return res.status(400).json({ error: 'Location is required.' });

  try {
    const { rows } = await pgPool.query(
      `INSERT INTO leakage_reports (account_number, location, district, description, priority)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.account_number, location, district || null, description || null, priority || 'Medium']
    );
    res.status(201).json({ message: 'Leakage report submitted.', report: rows[0] });
  } catch (err) {
    console.error('[Leakages/post]', err.message);
    res.status(500).json({ error: 'Could not submit report.' });
  }
});

router.get('/my', authenticate, async (req, res) => {
  try {
    const { rows } = await pgPool.query(
      `SELECT * FROM leakage_reports WHERE account_number = $1 ORDER BY reported_at DESC`,
      [req.user.account_number]
    );
    res.json({ reports: rows });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch your reports.' });
  }
});

router.get('/', authenticate, authorize('admin', 'branch_manager'), async (req, res) => {
  const { status, priority, district } = req.query;
  const params = []; const conditions = [];

  if (status) { params.push(status); conditions.push(`lr.status = $${params.length}`); }
  if (priority) { params.push(priority); conditions.push(`lr.priority = $${params.length}`); }
  if (district) { params.push(district); conditions.push(`lr.district = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pgPool.query(
      `SELECT lr.*, c.name, c.phone FROM leakage_reports lr
       LEFT JOIN customers c ON lr.account_number = c.account_number
       ${where} ORDER BY
         CASE lr.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
         lr.reported_at DESC`,
      params
    );
    res.json({ reports: rows });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch reports.' });
  }
});

router.patch('/:report_id/status', authenticate, authorize('admin', 'branch_manager'), async (req, res) => {
  const { status } = req.body;
  const valid = ['Open', 'In Progress', 'Resolved', 'Closed'];
  if (!valid.includes(status)) return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });

  try {
    const resolvedAt = status === 'Resolved' ? 'NOW()' : 'NULL';
    const { rows } = await pgPool.query(
      `UPDATE leakage_reports SET status = $1, resolved_at = ${resolvedAt}
       WHERE report_id = $2 RETURNING *`,
      [status, req.params.report_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Report not found.' });
    res.json({ message: 'Report status updated.', report: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Could not update report.' });
  }
});

module.exports = router;
