

const express  = require('express');
const { pool: pgPool }    = require('../db/postgres');
const { pool: mysqlPool } = require('../db/mysql');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', authenticate, authorize('admin', 'branch_manager'), async (req, res) => {
  try {

    const { rows: pgStats } = await pgPool.query(`
      SELECT
        (SELECT COUNT(*) FROM customers WHERE role = 'customer') AS total_customers,
        (SELECT COUNT(*) FROM bills) AS total_bills,
        (SELECT COALESCE(SUM(total_amount),0) FROM bills) AS total_billed,
        (SELECT COALESCE(SUM(total_amount),0) FROM bills WHERE payment_status = 'Paid') AS total_collected,
        (SELECT COALESCE(SUM(total_amount),0) FROM bills WHERE payment_status IN ('Unpaid','Overdue')) AS total_outstanding,
        (SELECT COUNT(*) FROM leakage_reports WHERE status = 'Open') AS open_leakage_reports
    `);

    const [mysqlStats] = await mysqlPool.query(`
      SELECT
        COUNT(*) AS total_readings,
        COALESCE(SUM(units_consumed), 0) AS total_units_distributed,
        COALESCE(AVG(units_consumed), 0) AS avg_consumption
      FROM water_usage
    `);

    res.json({
      kpis: {
        ...pgStats[0],
        ...mysqlStats[0]
      }
    });
  } catch (err) {
    console.error('[Reports/dashboard]', err.message);
    res.status(500).json({ error: 'Could not fetch dashboard data.' });
  }
});

router.get('/district', authenticate, authorize('admin', 'branch_manager'), async (req, res) => {
  try {
    const { rows } = await pgPool.query(
      `SELECT * FROM v_district_summary ORDER BY total_outstanding DESC`
    );
    res.json({ districts: rows });
  } catch (err) {
    console.error('[Reports/district]', err.message);
    res.status(500).json({ error: 'Could not fetch district report.' });
  }
});

router.get('/monthly', authenticate, authorize('admin', 'branch_manager'), async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  try {
    const { rows } = await pgPool.query(
      `SELECT
         EXTRACT(MONTH FROM billing_month) AS month,
         TO_CHAR(billing_month, 'Mon') AS month_name,
         COUNT(*) AS bills_issued,
         SUM(total_amount) AS total_billed,
         SUM(CASE WHEN payment_status = 'Paid' THEN total_amount ELSE 0 END) AS collected,
         SUM(CASE WHEN payment_status != 'Paid' THEN total_amount ELSE 0 END) AS outstanding
       FROM bills
       WHERE EXTRACT(YEAR FROM billing_month) = $1
       GROUP BY EXTRACT(MONTH FROM billing_month), TO_CHAR(billing_month, 'Mon')
       ORDER BY month`,
      [parseInt(year)]
    );
    res.json({ year: parseInt(year), monthly: rows });
  } catch (err) {
    console.error('[Reports/monthly]', err.message);
    res.status(500).json({ error: 'Could not generate monthly report.' });
  }
});

router.get('/leakages', authenticate, authorize('admin', 'branch_manager'), async (req, res) => {
  try {
    const { rows } = await pgPool.query(
      `SELECT lr.*, c.name, c.phone
       FROM leakage_reports lr
       LEFT JOIN customers c ON lr.account_number = c.account_number
       ORDER BY lr.reported_at DESC`
    );
    res.json({ reports: rows });
  } catch (err) {
    console.error('[Reports/leakages]', err.message);
    res.status(500).json({ error: 'Could not fetch leakage reports.' });
  }
});

module.exports = router;
