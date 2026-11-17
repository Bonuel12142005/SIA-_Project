import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { sequelize, User, Member, Livestock, LivestockHealthRecord, LivestockWeightHistory } from '../app/models/index.js';
import { createDatabaseIfNotExists } from '../config/database.js';

dotenv.config();

async function runSeed() {
  console.log('🌱 Starting KAMBAC Database Seeder...');

  try {
    await createDatabaseIfNotExists();
    await sequelize.authenticate();
    await sequelize.sync();

    // 1. Seed Admin User
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@kambac.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
    const adminName = process.env.ADMIN_NAME || 'KAMBAC Administrator';

    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        status: 'active'
      });
      console.log(`✅ Default Administrator seeded: ${adminEmail}`);
    } else {
      console.log(`ℹ️ Admin user already exists: ${adminEmail}`);
    }

    // 2. Seed Initial Members
    const membersData = [
      {
        member_code: 'MEM-001',
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        contact_number: '09171234567',
        address: 'Brgy. San Jose, Naujan, Oriental Mindoro',
        membership_status: 'active'
      },
      {
        member_code: 'MEM-002',
        first_name: 'Maria',
        last_name: 'Santos',
        contact_number: '09189876543',
        address: 'Brgy. Barcenaga, Naujan, Oriental Mindoro',
        membership_status: 'active'
      },
      {
        member_code: 'MEM-003',
        first_name: 'Pedro',
        last_name: 'Reyes',
        contact_number: '09205551234',
        address: 'Brgy. Aurora, Naujan, Oriental Mindoro',
        membership_status: 'active'
      }
    ];

    for (const mData of membersData) {
      const [member, created] = await Member.findOrCreate({
        where: { member_code: mData.member_code },
        defaults: mData
      });
      if (created) console.log(`✅ Member seeded: ${member.first_name} ${member.last_name} (${member.member_code})`);
    }

    // 3. Seed Sample Livestock Records (matching realistic farmer livestock data)
    const mem1 = await Member.findOne({ where: { member_code: 'MEM-001' } });
    const mem2 = await Member.findOne({ where: { member_code: 'MEM-002' } });

    if (mem1 && mem2) {
      const count = await Livestock.count();
      if (count === 0) {
        // Livestock 1
        const live1 = await Livestock.create({
          livestock_code: 'LS-2025-001',
          member_id: mem1.id,
          animal_name: 'Bessie',
          animal_type: 'Cattle',
          breed: 'Brahman Cross',
          sex: 'Female',
          date_acquired: '2024-01-15',
          birth_date: '2023-03-10',
          initial_weight: 220.00,
          current_weight: 345.50,
          health_status: 'Healthy',
          estimated_value: 48500.00,
          archive_status: 'active'
        });

        await LivestockWeightHistory.create({
          livestock_id: live1.id,
          weight: 220.00,
          recorded_date: '2024-01-15',
          remarks: 'Initial weight recorded upon acquisition'
        });
        await LivestockWeightHistory.create({
          livestock_id: live1.id,
          weight: 345.50,
          recorded_date: '2024-11-01',
          remarks: 'Routine quarterly weighing'
        });

        await LivestockHealthRecord.create({
          livestock_id: live1.id,
          health_condition: 'Healthy',
          diagnosis: 'Annual deworming and vitamin supplement',
          treatment: 'Ivermectin + ADE vitamins injection',
          record_date: '2024-06-15',
          remarks: 'Animal is active and feed intake is good'
        });

        // Livestock 2
        const live2 = await Livestock.create({
          livestock_id: undefined,
          livestock_code: 'LS-2025-002',
          member_id: mem2.id,
          animal_name: 'Thunder',
          animal_type: 'Carabao',
          breed: 'Philippine Carabao',
          sex: 'Male',
          date_acquired: '2024-03-20',
          birth_date: '2022-08-05',
          initial_weight: 380.00,
          current_weight: 420.00,
          health_status: 'Needs Monitoring',
          estimated_value: 55000.00,
          archive_status: 'active'
        });

        await LivestockWeightHistory.create({
          livestock_id: live2.id,
          weight: 380.00,
          recorded_date: '2024-03-20',
          remarks: 'Baseline registration weight'
        });
        await LivestockWeightHistory.create({
          livestock_id: live2.id,
          weight: 420.00,
          recorded_date: '2024-10-15',
          remarks: 'Pre-season draft animal health check'
        });

        await LivestockHealthRecord.create({
          livestock_id: live2.id,
          health_condition: 'Needs Monitoring',
          diagnosis: 'Mild footrot in right front hoof',
          treatment: 'Cleaned hoof and applied antiseptic spray + antibiotic ointment',
          record_date: '2024-10-25',
          remarks: 'Isolate on dry bedding and check in 5 days'
        });

        // Livestock 3
        const live3 = await Livestock.create({
          livestock_code: 'LS-2025-003',
          member_id: mem1.id,
          animal_name: 'Billy',
          animal_type: 'Goat',
          breed: 'Boer Cross',
          sex: 'Male',
          date_acquired: '2024-05-10',
          birth_date: '2023-11-20',
          initial_weight: 28.50,
          current_weight: 42.00,
          health_status: 'Healthy',
          estimated_value: 12500.00,
          archive_status: 'active'
        });

        await LivestockWeightHistory.create({
          livestock_id: live3.id,
          weight: 28.50,
          recorded_date: '2024-05-10',
          remarks: 'Entry weight'
        });

        await LivestockHealthRecord.create({
          livestock_id: live3.id,
          health_condition: 'Healthy',
          diagnosis: 'Routine health screening',
          treatment: 'Oral dewormer administered',
          record_date: '2024-07-01',
          remarks: 'Clear of internal parasites'
        });

        console.log('✅ Sample Livestock, Weight & Health records seeded.');
      }
    }

    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runSeed();
