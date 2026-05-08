

const express  = require('express');
const { pool: pgPool }    = require('../db/postgres');
const { pool: mysqlPool } = require('../db/mysql');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

async function calculateBill(unitsConsumed) {
  const { rows: rates } = await pgPool.query(
    `SELECT tier, min_units, max_units, cost_per_unit
     FROM billing_rates WHERE is_current = TRUE ORDER BY tier`
  );

  let remaining = parseFloat(unitsConsumed);
  let total = 0;

  for (const rate of rates) {
    if (remaining <= 0) break;
    const min = parseFloat(rate.min_units);
    const max = rate.max_units !== null ? parseFloat(rate.max_units) : Infinity;
    const tierUnits = Math.min(remaining, max - min + 0.01);
    if (tierUnits > 0) {
      total += tierUnits * parseFloat(rate.cost_per_unit);
      remaining -= tierUnits;
    }
  }
  return parseFloat(total.toFixed(2));
}

router.get('/my', authenticate, async (req, res) => {
  try {
    const { rows: bills } = await pgPool.query(
      `SELECT bill_id, billing_month, units_consumed, total_amount, payment_status, due_date, issued_at
       FROM bills WHERE account_number = $1 ORDER BY billing_month DESC`,
      [req.user.account_number]
    );

    const billIds = bills.map(b => b.bill_id);
    let paymentsMap = {};
    if (billIds.length > 0) {
      const placeholders = billIds.map(() => '?').join(',');
      const [rows] = await mysqlPool.query(
        `SELECT bill_id, total_paid, payment_count, last_payment_date
         FROM v_bill_payments WHERE bill_id IN (${placeholders})`,
        billIds
      );
      rows.forEach(r => { paymentsMap[r.bill_id] = r; });
    }

    const enriched = bills.map(b => ({
      ...b,
      total_paid: paymentsMap[b.bill_id]?.total_paid || 0,
      payment_count: paymentsMap[b.bill_id]?.payment_count || 0,
      last_payment_date: paymentsMap[b.bill_id]?.last_payment_date || null,
      balance: parseFloat(b.total_amount) - parseFloat(paymentsMap[b.bill_id]?.total_paid || 0)
    }));

    res.json({ bills: enriched });
  } catch (err) {
    console.error('[Bills/my]', err.message);
    res.status(500).json({ error: 'Could not fetch bills.' });
  }
});

router.get('/:bill_id', authenticate, async (req, res) => {
  try {
    const { rows } = await pgPool.query(
      `SELECT b.*, c.name, c.email, c.district
       FROM bills b JOIN customers c ON b.account_number = c.account_number
       WHERE b.bill_id = $1`,
      [req.params.bill_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Bill not found.' });

    const bill = rows[0];

    if (req.user.role === 'customer' && bill.account_number !== req.user.account_number) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const [payments] = await mysqlPool.query(
      `SELECT payment_id, amount_paid, payment_method, transaction_ref, payment_date
       FROM payments WHERE bill_id = ? ORDER BY payment_date DESC`,
      [bill.bill_id]
    );

    res.json({ bill, payments });
  } catch (err) {
    console.error('[Bills/detail]', err.message);
    res.status(500).json({ error: 'Could not fetch bill details.' });
  }
});

router.post('/generate', authenticate, authorize('admin'), async (req, res) => {
  const { account_number, billing_month } = req.body;
  if (!account_number || !billing_month) {
    return res.status(400).json({ error: 'account_number and billing_month are required.' });
  }

  try {

    const [usageRows] = await mysqlPool.query(
      `SELECT units_consumed FROM water_usage
       WHERE account_number = ? AND billing_month = ?`,
      [account_number, billing_month]
    );

    if (usageRows.length === 0) {
      return res.status(404).json({ error: 'No water usage record found for this month.' });
    }

    const units = parseFloat(usageRows[0].units_consumed);
    const totalAmount = await calculateBill(units);
    const dueDate = new Date(billing_month);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(15);

    const { rows } = await pgPool.query(
      `INSERT INTO bills (account_number, billing_month, units_consumed, total_amount, due_date)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [account_number, billing_month, units, totalAmount, dueDate.toISOString().split('T')[0]]
    );

    if (rows.length === 0) {
      return res.status(409).json({ error: 'Bill already exists for this month.' });
    }

    res.status(201).json({ message: 'Bill generated successfully.', bill: rows[0] });
  } catch (err) {
    console.error('[Bills/generate]', err.message);
    res.status(500).json({ error: 'Failed to generate bill.' });
  }
});

router.get('/', authenticate, authorize('admin', 'branch_manager'), async (req, res) => {
  const { status, district, month, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const conditions = [];

  if (status) { params.push(status); conditions.push(`b.payment_status = $${params.length}`); }
  if (district) { params.push(district); conditions.push(`c.district = $${params.length}`); }
  if (month) { params.push(month); conditions.push(`b.billing_month = $${params.length}`); }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit)); params.push(offset);

  try {
    const { rows } = await pgPool.query(
      `SELECT b.bill_id, b.account_number, c.name, c.district,
              b.billing_month, b.units_consumed, b.total_amount,
              b.payment_status, b.due_date, b.issued_at
       FROM bills b JOIN customers c ON b.account_number = c.account_number
       ${whereClause}
       ORDER BY b.billing_month DESC, b.issued_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ bills: rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[Bills/all]', err.message);
    res.status(500).json({ error: 'Could not fetch bills.' });
  }
});

router.patch('/:bill_id/status', authenticate, authorize('admin'), async (req, res) => {
  const { payment_status } = req.body;
  const validStatuses = ['Paid', 'Unpaid', 'Overdue', 'Partial'];
  if (!validStatuses.includes(payment_status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const { rows } = await pgPool.query(
      `UPDATE bills SET payment_status = $1, updated_at = NOW()
       WHERE bill_id = $2 RETURNING *`,
      [payment_status, req.params.bill_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Bill not found.' });
    res.json({ message: 'Bill status updated.', bill: rows[0] });
  } catch (err) {
    console.error('[Bills/status]', err.message);
    res.status(500).json({ error: 'Could not update bill status.' });
  }
});

module.exports = router;
