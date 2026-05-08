

const express  = require('express');
const { pool: mysqlPool } = require('../db/mysql');
const { pool: pgPool }    = require('../db/postgres');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('admin', 'branch_manager'), async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(
      `SELECT usage_id, account_number, billing_month, previous_reading, current_reading,
              units_consumed, recorded_by, recorded_at, notes
       FROM water_usage ORDER BY recorded_at DESC LIMIT 100`
    );
    res.json({ usage: rows });
  } catch (err) {
    console.error('[Usage/all]', err.message);
    res.status(500).json({ error: 'Could not fetch usage data.' });
  }
});

router.get('/my', authenticate, async (req, res) => {
  const { year } = req.query;
  let query = `SELECT usage_id, billing_month, previous_reading, current_reading,
                      units_consumed, recorded_at, notes
               FROM water_usage WHERE account_number = ?`;
  const params = [req.user.account_number];

  if (year) {
    query += ' AND YEAR(billing_month) = ?';
    params.push(parseInt(year));
  }
  query += ' ORDER BY billing_month DESC';

  try {
    const [rows] = await mysqlPool.query(query, params);
    res.json({ usage: rows });
  } catch (err) {
    console.error('[Usage/my]', err.message);
    res.status(500).json({ error: 'Could not fetch usage data.' });
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { account_number, billing_month, previous_reading, current_reading, recorded_by, notes } = req.body;

  if (!account_number || !billing_month || current_reading === undefined) {
    return res.status(400).json({ error: 'account_number, billing_month, and current_reading are required.' });
  }

  if (parseFloat(current_reading) < parseFloat(previous_reading || 0)) {
    return res.status(400).json({ error: 'Current reading cannot be less than previous reading.' });
  }

  try {

    const { rows: customers } = await pgPool.query(
      'SELECT account_number FROM customers WHERE account_number = $1',
      [account_number]
    );
    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer account not found.' });
    }

    const [result] = await mysqlPool.query(
      `INSERT INTO water_usage (account_number, billing_month, previous_reading, current_reading, recorded_by, notes)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         previous_reading = VALUES(previous_reading),
         current_reading  = VALUES(current_reading),
         recorded_by      = VALUES(recorded_by),
         notes            = VALUES(notes),
         recorded_at      = NOW()`,
      [account_number, billing_month, previous_reading || 0, current_reading, recorded_by || req.user.name, notes || null]
    );

    res.status(201).json({ message: 'Water usage recorded successfully.', insertId: result.insertId });
  } catch (err) {
    console.error('[Usage/post]', err.message);
    res.status(500).json({ error: 'Could not record water usage.' });
  }
});

router.get('/account/:account_number', authenticate, authorize('admin', 'branch_manager'), async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(
      `SELECT usage_id, billing_month, previous_reading, current_reading,
              units_consumed, recorded_by, recorded_at, notes
       FROM water_usage WHERE account_number = ? ORDER BY billing_month DESC`,
      [req.params.account_number]
    );
    res.json({ account_number: req.params.account_number, usage: rows });
  } catch (err) {
    console.error('[Usage/account]', err.message);
    res.status(500).json({ error: 'Could not fetch usage data.' });
  }
});

router.get('/patterns', authenticate, authorize('admin', 'branch_manager'), async (req, res) => {
  try {

    const [usageData] = await mysqlPool.query(
      `SELECT account_number,
              YEAR(billing_month) AS yr,
              MONTH(billing_month) AS mo,
              AVG(units_consumed) AS avg_units,
              SUM(units_consumed) AS total_units
       FROM water_usage
       GROUP BY account_number, YEAR(billing_month), MONTH(billing_month)
       ORDER BY yr DESC, mo DESC`
    );

    const accountNumbers = [...new Set(usageData.map(r => r.account_number))];
    let districtMap = {};
    if (accountNumbers.length > 0) {
      const placeholders = accountNumbers.map((_, i) => `$${i + 1}`).join(',');
      const { rows: customers } = await pgPool.query(
        `SELECT account_number, district FROM customers WHERE account_number IN (${placeholders})`,
        accountNumbers
      );
      customers.forEach(c => { districtMap[c.account_number] = c.district; });
    }

    const districtStats = {};
    usageData.forEach(row => {
      const district = districtMap[row.account_number] || 'Unknown';
      const key = `${district}-${row.yr}-${row.mo}`;
      if (!districtStats[key]) {
        districtStats[key] = { district, year: row.yr, month: row.mo, total_units: 0, account_count: 0 };
      }
      districtStats[key].total_units += parseFloat(row.total_units);
      districtStats[key].account_count += 1;
    });

    const result = Object.values(districtStats).map(d => ({
      ...d,
      avg_units_per_customer: parseFloat((d.total_units / d.account_count).toFixed(2))
    }));

    res.json({ patterns: result });
  } catch (err) {
    console.error('[Usage/patterns]', err.message);
    res.status(500).json({ error: 'Could not generate usage patterns.' });
  }
});

module.exports = router;
