import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'kambac_db';

/**
 * Automatically creates the MySQL database if it does not already exist
 */
export async function createDatabaseIfNotExists() {
  try {
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ MySQL database '${DB_NAME}' verified or created.`);
    await connection.end();
    return true;
  } catch (error) {
    console.warn(`⚠️ Warning: Could not automatically create MySQL database '${DB_NAME}'.`);
    console.warn(`Reason: ${error.message}`);
    console.warn(`If using XAMPP/phpMyAdmin, please ensure MySQL is running and create '${DB_NAME}' via phpMyAdmin.`);
    return false;
  }
}

/**
 * Sequelize ORM instance connected to kambac_db
 */
export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? (msg) => console.log(`[Sequelize] ${msg}`) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true
  }
});

export default sequelize;
