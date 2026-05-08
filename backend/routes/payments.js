

const express  = require('express');
const { pool: mysqlPool } = require('../db/mysql');
const { pool: pgPool }    = require('../db/postgres');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const mockPaymentGatewayAPI = async (amount, method) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, ref: `PAY-${method.toUpperCase()}-${Math.floor(Math.random() * 100000)}` });
    }, 600); // Simulate network latency to payment processor
  });
};

router.post('/', authenticate, async (req, res) => {
  let { bill_id, amount_paid, payment_method, transaction_ref, notes } = req.body;

  if (!bill_id || !amount_paid) return res.status(400).json({ error: 'bill_id and amount_paid are required.' });
  if (parseFloat(amount_paid) <= 0) return res.status(400).json({ error: 'Payment amount must be greater than zero.' });

  try {

    const { rows: bills } = await pgPool.query(
      `SELECT bill_id, account_number, total_amount, payment_status FROM bills WHERE bill_id = $1`,
      [bill_id]
    );

    if (bills.length === 0) return res.status(404).json({ error: 'Bill not found.' });
    const bill = bills[0];

    if (req.user.role === 'customer' && bill.account_number !== req.user.account_number) {
      return res.status(403).json({ error: 'You can only pay your own bills.' });
    }

    const mysqlConn = await mysqlPool.getConnection();
    const pgClient = await pgPool.connect();

    try {
      await mysqlConn.query('START TRANSACTION'); // MySQL TCL
      await pgClient.query('BEGIN'); // PostgreSQL TCL

      if (['EFT', 'Card', 'Mobile Money'].includes(payment_method)) {
        const gatewayRes = await mockPaymentGatewayAPI(amount_paid, payment_method);
        if (!gatewayRes.success) throw new Error('Payment gateway rejected transaction.');
        transaction_ref = transaction_ref || gatewayRes.ref;
      }

      const [result] = await mysqlConn.query(
        `INSERT INTO payments (bill_id, account_number, amount_paid, payment_method, transaction_ref, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [bill_id, bill.account_number, parseFloat(amount_paid), payment_method || 'Cash', transaction_ref || null, notes || null]
      );

      const [totals] = await mysqlConn.query(
        `SELECT COALESCE(SUM(amount_paid), 0) AS total_paid FROM payments WHERE bill_id = ?`,
        [bill_id]
      );
      const totalPaid = parseFloat(totals[0].total_paid);
      const billAmount = parseFloat(bill.total_amount);

      let newStatus = totalPaid >= billAmount ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Unpaid');

      await pgClient.query(
        `UPDATE bills SET payment_status = $1, updated_at = NOW() WHERE bill_id = $2`,
        [newStatus, bill_id]
      );

      await mysqlConn.query('COMMIT');
      await pgClient.query('COMMIT');

      res.status(201).json({
        message: 'Payment processed securely via Gateway and recorded successfully.',
        payment_id: result.insertId,
        total_paid: totalPaid,
        bill_status: newStatus
      });
    } catch (txErr) {

      await mysqlConn.query('ROLLBACK');
      await pgClient.query('ROLLBACK');
      throw txErr;
    } finally {
      mysqlConn.release();
      pgClient.release();
    }
  } catch (err) {
    console.error('[Payments/post]', err.message);
    res.status(500).json({ error: 'Could not process payment.' });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {

    const [payments] = await mysqlPool.query(
      `SELECT p.payment_id, p.bill_id, p.amount_paid, p.payment_method,
              p.transaction_ref, p.payment_date
       FROM payments p
       WHERE p.account_number = ?
       ORDER BY p.payment_date DESC`,
      [req.user.account_number]
    );

    res.json({ payments });
  } catch (err) {
    console.error('[Payments/history]', err.message);
    res.status(500).json({ error: 'Could not fetch payment history.' });
  }
});

router.get('/outstanding', authenticate, authorize('admin', 'branch_manager'), async (req, res) => {
  try {

    const { rows: unpaidBills } = await pgPool.query(
      `SELECT b.bill_id, b.account_number, c.name, c.district,
              b.billing_month, b.total_amount, b.payment_status, b.due_date
       FROM bills b
       JOIN customers c ON b.account_number = c.account_number
       WHERE b.payment_status IN ('Unpaid','Overdue','Partial')
       ORDER BY b.due_date ASC`
    );

    const billIds = unpaidBills.map(b => b.bill_id);
    let paymentTotals = {};
    if (billIds.length > 0) {
      const placeholders = billIds.map(() => '?').join(',');
      const [rows] = await mysqlPool.query(
        `SELECT bill_id, COALESCE(SUM(amount_paid), 0) AS total_paid
         FROM payments WHERE bill_id IN (${placeholders}) GROUP BY bill_id`,
        billIds
      );
      rows.forEach(r => { paymentTotals[r.bill_id] = parseFloat(r.total_paid); });
    }

    const result = unpaidBills.map(b => ({
      ...b,
      total_paid: paymentTotals[b.bill_id] || 0,
      outstanding: parseFloat(b.total_amount) - (paymentTotals[b.bill_id] || 0)
    }));

    const summary = {
      total_accounts: new Set(result.map(r => r.account_number)).size,
      total_bills: result.length,
      total_outstanding: result.reduce((sum, r) => sum + r.outstanding, 0).toFixed(2)
    };

    res.json({ summary, bills: result });
  } catch (err) {
    console.error('[Payments/outstanding]', err.message);
    res.status(500).json({ error: 'Could not fetch outstanding balances.' });
  }
});

module.exports = router;
