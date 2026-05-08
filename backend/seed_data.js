const bcrypt = require('bcryptjs');
const { pool: pgPool } = require('./db/postgres');
const { pool: mysqlPool } = require('./db/mysql');
const crypto = require('crypto');
require('dotenv').config();

const customers = [
  { account: 'WAS-001', name: 'Mosa Phoolo', email: 'mosa@example.com', phone: '+266 5800 0001', district: 'Maseru' },
  { account: 'WAS-002', name: 'Teboho Monyamane', email: 'teboho@example.com', phone: '+266 5800 0002', district: 'Leribe' },
  { account: 'WAS-003', name: 'Itumeleng Malataliana', email: 'itumeleng@example.com', phone: '+266 5800 0003', district: 'Berea' },
  { account: 'WAS-004', name: 'Karabo Letsoela', email: 'karabo@example.com', phone: '+266 5800 0004', district: 'Mafeteng' },
  { account: 'WAS-005', name: 'Rethabile Nthako', email: 'rethabile@example.com', phone: '+266 5800 0005', district: 'Maseru' },
];

const months = ['2026-02-01', '2026-03-01', '2026-04-01'];

function calculateAmount(units) {
  let amount = 0;
  if (units > 25) {
    amount += (10 * 5.50) + (15 * 8.20) + ((units - 25) * 12.40);
  } else if (units > 10) {
    amount += (10 * 5.50) + ((units - 10) * 8.20);
  } else {
    amount += units * 5.50;
  }
  return amount;
}

async function seedData() {
  console.log('🌱 Starting comprehensive data seed...');
  try {
    const hash = await bcrypt.hash('Password@123', 10);

    for (const c of customers) {

      await pgPool.query(
        `INSERT INTO customers (account_number, name, email, phone, district, password_hash, role)
         VALUES ($1, $2, $3, $4, $5, $6, 'customer')
         ON CONFLICT (account_number) DO NOTHING`,
        [c.account, c.name, c.email, c.phone, c.district, hash]
      );
      console.log(`👤 Created customer: ${c.name}`);

      let prevReading = Math.floor(Math.random() * 100);

      for (const month of months) {
        const usage = parseFloat((Math.random() * 20 + 8).toFixed(2)); // random between 8 and 28 kL
        const currentReading = parseFloat((prevReading + usage).toFixed(2));

        await mysqlPool.query(
          `INSERT INTO water_usage (account_number, billing_month, previous_reading, current_reading, recorded_by, recorded_at)
           VALUES (?, ?, ?, ?, 'System Seed', NOW() - INTERVAL 10 DAY)
           ON DUPLICATE KEY UPDATE current_reading=current_reading`,
          [c.account, month, prevReading, currentReading]
        );

        const amount = calculateAmount(usage);
        const dueDate = new Date(month);
        dueDate.setDate(dueDate.getDate() + 20); // due on the 20th
        const billId = crypto.randomUUID();
        const status = month === '2026-04-01' ? 'Unpaid' : 'Paid'; // Last month is unpaid

        await pgPool.query(
          `INSERT INTO bills (bill_id, account_number, billing_month, units_consumed, total_amount, due_date, payment_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [billId, c.account, month, usage, amount, dueDate, status]
        );

        if (status === 'Paid') {
          await mysqlPool.query(
            `INSERT INTO payments (bill_id, account_number, amount_paid, payment_method, transaction_ref, payment_date)
             VALUES (?, ?, ?, ?, ?, NOW() - INTERVAL 5 DAY)`,
            [billId, c.account, amount, 'EFT', `EFT-${Math.floor(Math.random() * 100000)}`]
          );
        }

        prevReading = currentReading;
      }
    }
    console.log('✅ Seed complete! Historical bills, usage, and payments added.');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await pgPool.end();
    await mysqlPool.end();
    process.exit();
  }
}

seedData();
