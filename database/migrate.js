import { createDatabaseIfNotExists, sequelize } from '../config/database.js';
import models from '../app/models/index.js';

async function runMigration() {
  console.log('🔄 Starting KAMBAC Database Migration...');
  
  try {
    // 1. Ensure database exists
    await createDatabaseIfNotExists();

    // 2. Test Sequelize connection
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL database via Sequelize ORM!');

    // 3. Synchronize all models and create tables
    // { alter: true } safely adjusts schemas without dropping data, or { force: false }
    await sequelize.sync({ alter: true });
    console.log('✅ Tables created/verified for all models:');
    console.log('   - users');
    console.log('   - members');
    console.log('   - livestock');
    console.log('   - livestock_health_records');
    console.log('   - livestock_weight_history');
    console.log('   - livestock_archive_history');
    console.log('🎉 Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();
