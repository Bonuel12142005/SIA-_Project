#!/usr/bin/env node
import { execSync } from 'child_process';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'db';
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 3306;
const DB_USER = process.env.DB_USER || 'kambac_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'kambac_secure_password';
const DB_NAME = process.env.DB_NAME || 'kambac_db';

const MAX_RETRIES = 30;
const RETRY_INTERVAL_MS = 2000;

async function waitForDatabase() {
  console.log(`⏳ Waiting for MySQL database at ${DB_HOST}:${DB_PORT}...`);
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const conn = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        connectTimeout: 5000
      });
      await conn.ping();
      await conn.end();
      console.log('✅ Connected successfully to MySQL database!');
      return;
    } catch (err) {
      console.log(`[Attempt ${attempt}/${MAX_RETRIES}] MySQL not ready yet (${err.code || err.message}). Retrying in 2s...`);
      await new Promise(r => setTimeout(r, RETRY_INTERVAL_MS));
    }
  }
  throw new Error('❌ Timed out waiting for MySQL database.');
}

async function main() {
  try {
    await waitForDatabase();

    console.log('🔄 Running migrations...');
    execSync('node database/migrate.js', { stdio: 'inherit' });

    console.log('🌱 Checking seeders...');
    execSync('node database/seed.js', { stdio: 'inherit' });

    console.log('🚀 Starting KAMBAC Livestock Management System...');
    execSync('node index.js', { stdio: 'inherit' });
  } catch (err) {
    console.error('Fatal initialization error:', err.message);
    process.exit(1);
  }
}

main();
