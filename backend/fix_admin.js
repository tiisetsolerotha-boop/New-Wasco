const bcrypt = require('bcryptjs');
const { pool } = require('./db/postgres');
require('dotenv').config();

async function fixAdmin() {
  try {
    const hash = await bcrypt.hash('Admin@1234', 10);
    await pool.query('UPDATE customers SET password_hash = $1 WHERE email = $2', [hash, 'admin@wasco.ls']);
    console.log('✅ Admin password has been successfully reset to Admin@1234');
  } catch (err) {
    console.error('Failed to reset password:', err);
  } finally {
    await pool.end();
    process.exit();
  }
}

fixAdmin();
