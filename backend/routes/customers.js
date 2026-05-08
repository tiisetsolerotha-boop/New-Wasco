

const express = require('express');
const bcrypt  = require('bcryptjs');
const { pool: pgPool } = require('../db/postgres');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('admin', 'branch_manager'), async (req, res) => {
  const { district, role, search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const conditions = [];

  if (district) { params.push(district); conditions.push(`district = $${params.length}`); }
  if (role) { params.push(role); conditions.push(`role = $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR account_number ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit)); params.push(offset);

  try {
    const { rows } = await pgPool.query(
      `SELECT account_number, name, email, phone, address, district, role, is_active, created_at
       FROM customers ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const { rows: countRows } = await pgPool.query(
      `SELECT COUNT(*) FROM customers ${where}`,
      params.slice(0, -2)
    );

    res.json({ customers: rows, total: parseInt(countRows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[Customers/list]', err.message);
    res.status(500).json({ error: 'Could not fetch customers.' });
  }
});

router.get('/:account_number', authenticate, async (req, res) => {

  if (req.user.role === 'customer' && req.params.account_number !== req.user.account_number) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const { rows } = await pgPool.query(
      `SELECT account_number, name, email, phone, address, district, role, is_active, created_at
       FROM customers WHERE account_number = $1`,
      [req.params.account_number]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Customer not found.' });
    res.json({ customer: rows[0] });
  } catch (err) {
    console.error('[Customers/get]', err.message);
    res.status(500).json({ error: 'Could not fetch customer.' });
  }
});

router.put('/:account_number', authenticate, async (req, res) => {
  if (req.user.role !== 'admin' && req.params.account_number !== req.user.account_number) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const { name, email, phone, address, district } = req.body;
  let { role, is_active } = req.body;

  if (req.user.role !== 'admin') { role = undefined; is_active = undefined; }

  try {
    const { rows } = await pgPool.query(
      `UPDATE customers SET
         name      = COALESCE($1, name),
         email     = COALESCE($2, email),
         phone     = COALESCE($3, phone),
         address   = COALESCE($4, address),
         district  = COALESCE($5, district),
         role      = COALESCE($6, role),
         is_active = COALESCE($7, is_active),
         updated_at = NOW()
       WHERE account_number = $8
       RETURNING account_number, name, email, phone, address, district, role, is_active`,
      [name, email, phone, address, district, role || null, is_active !== undefined ? is_active : null, req.params.account_number]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Customer not found.' });
    res.json({ message: 'Profile updated.', customer: rows[0] });
  } catch (err) {
    console.error('[Customers/update]', err.message);
    res.status(500).json({ error: 'Could not update customer.' });
  }
});

router.post('/:account_number/reset-password', authenticate, authorize('admin'), async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const hash = await bcrypt.hash(new_password, 12);
    const { rowCount } = await pgPool.query(
      `UPDATE customers SET password_hash = $1, updated_at = NOW() WHERE account_number = $2`,
      [hash, req.params.account_number]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Customer not found.' });
    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error('[Customers/reset-pw]', err.message);
    res.status(500).json({ error: 'Could not reset password.' });
  }
});

router.delete('/:account_number', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { rowCount } = await pgPool.query(
      `DELETE FROM customers WHERE account_number = $1 AND role != 'admin'`,
      [req.params.account_number]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Customer not found or cannot delete admin.' });
    res.json({ message: 'Customer deleted.' });
  } catch (err) {
    console.error('[Customers/delete]', err.message);
    res.status(500).json({ error: 'Could not delete customer.' });
  }
});

module.exports = router;
