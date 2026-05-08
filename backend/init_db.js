const fs = require('fs');
const path = require('path');
const { pool: pgPool } = require('./db/postgres');
const { pool: mysqlPool } = require('./db/mysql');
require('dotenv').config();

async function runQueries() {
  console.log('🚀 Starting Database Initialization...\n');

  try {

    console.log('⏳ Executing PostgreSQL Schema...');
    const pgSchemaPath = path.join(__dirname, 'db', 'schema_postgres.sql');
    const pgSql = fs.readFileSync(pgSchemaPath, 'utf8');

    await pgPool.query(pgSql);
    console.log('✅ PostgreSQL Schema executed successfully!\n');

    console.log('⏳ Executing MySQL Schema...');
    const mysqlSchemaPath = path.join(__dirname, 'db', 'schema_mysql.sql');
    const mysqlSql = fs.readFileSync(mysqlSchemaPath, 'utf8');

    const mysql = require('mysql2/promise');
    const tempMysqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      multipleStatements: true, // required to run the whole schema file at once
      ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });

    await tempMysqlPool.query(mysqlSql);
    await tempMysqlPool.end();
    console.log('✅ MySQL Schema executed successfully!\n');

    console.log('🎉 Both databases have been fully initialized!');

  } catch (error) {
    console.error('\n❌ ERROR RUNNING QUERIES:');
    console.error(error.message);
    console.log('\nMake sure your .env file has the correct LIVE credentials for Supabase and Railway.');
  } finally {

    await pgPool.end();
    await mysqlPool.end();
    process.exit();
  }
}

runQueries();
