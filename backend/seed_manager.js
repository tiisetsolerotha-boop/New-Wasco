const bcrypt = require('bcryptjs');
const { pool } = require('./db/postgres');
require('dotenv').config();

async function seedManager() {
  try {
    const hash = await bcrypt.hash('Manager@1234', 10);
    await pool.query(
      `INSERT INTO customers (account_number, name, email, phone, district, password_hash, role) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT (email) DO NOTHING`,
      ['WASCO-MGR-01', 'Lerato (Branch Manager)', 'manager@wasco.ls', '+266 2200 1111', 'Maseru', hash, 'branch_manager']
    );
    console.log('✅ Branch Manager created successfully!');
  } catch (err) {
    console.error('Failed to create manager:', err);
  } finally {
    await pool.end();
    process.exit();
  }
}

seedManager();
