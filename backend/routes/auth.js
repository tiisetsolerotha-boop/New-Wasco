

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { pool: pgPool } = require('../db/postgres');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const generateAccountNumber = () => {
  const prefix = 'WAS';
  const number = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${number}`;
};

router.post('/register', async (req, res) => {
  const { name, email, phone, address, district, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {

    const existing = await pgPool.query(
      'SELECT account_number FROM customers WHERE email = $1', [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const account_number = generateAccountNumber();

    const result = await pgPool.query(
      `INSERT INTO customers (account_number, name, email, phone, address, district, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'customer')
       RETURNING account_number, name, email, role, district, created_at`,
      [account_number, name, email, phone || null, address || null, district || 'Maseru', password_hash]
    );

    const customer = result.rows[0];
    const token = jwt.sign(
      { account_number: customer.account_number, role: customer.role, name: customer.name, email: customer.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ message: 'Account created successfully.', token, user: customer });
  } catch (err) {
    console.error('[Auth/register]', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pgPool.query(
      `SELECT account_number, name, email, role, district, password_hash, is_active
       FROM customers WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is disabled. Contact WASCO support.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { account_number: user.account_number, role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password_hash, ...safeUser } = user;
    res.json({ message: 'Login successful.', token, user: safeUser });
  } catch (err) {
    console.error('[Auth/login]', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pgPool.query(
      `SELECT account_number, name, email, phone, address, district, role, is_active, created_at
       FROM customers WHERE account_number = $1`,
      [req.user.account_number]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[Auth/me]', err.message);
    res.status(500).json({ error: 'Could not fetch user profile.' });
  }
});

module.exports = router;
