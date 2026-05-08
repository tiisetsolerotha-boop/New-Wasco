

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.MYSQL_HOST,
  port:               parseInt(process.env.MYSQL_PORT || '3306'),
  database:           process.env.MYSQL_DATABASE,
  user:               process.env.MYSQL_USER,
  password:           process.env.MYSQL_PASSWORD,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  enableKeepAlive:    true,
  ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT NOW() AS time');
    conn.release();
    console.log(`[MySQL] Connected ✓  (server time: ${rows[0].time})`);
  } catch (err) {
    console.error('[MySQL] Connection FAILED:', err.message);
  }
};

module.exports = { pool, testConnection };
