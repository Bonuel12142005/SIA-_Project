/*
  KAMBAC System Self-Test & Diagnostic Script
*/
import fs from 'fs';
import path from 'path';

console.log('🧪 Starting KAMBAC System Verification Test...\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failCount++;
  }
}

const rootDir = process.cwd();

// 1. Verify Directories
const requiredDirs = [
  'app/controllers',
  'app/models',
  'app/middleware',
  'config',
  'database',
  'routes',
  'views/partials',
  'views/livestock',
  'views/members',
  'public/assets/css',
  'storage/logs',
  'storage/uploads'
];

requiredDirs.forEach(dir => {
  assert(fs.existsSync(path.join(rootDir, dir)), `Directory exists: ${dir}`);
});

// 2. Verify Key Source Files
const requiredFiles = [
  'package.json',
  '.env',
  '.env.example',
  '.gitignore',
  'create.js',
  'index.js',
  'config/database.js',
  'app/models/index.js',
  'app/models/User.js',
  'app/models/Member.js',
  'app/models/Livestock.js',
  'app/models/LivestockHealthRecord.js',
  'app/models/LivestockWeightHistory.js',
  'app/models/LivestockArchiveHistory.js',
  'app/controllers/authController.js',
  'app/controllers/memberController.js',
  'app/controllers/livestockController.js',
  'app/middleware/authMiddleware.js',
  'database/migrate.js',
  'database/seed.js',
  'routes/index.js',
  'views/partials/head.xian',
  'views/partials/nav.xian',
  'views/partials/footer.xian',
  'views/login.xian',
  'views/dashboard.xian',
  'views/members/index.xian',
  'views/livestock/archived.xian'
];

requiredFiles.forEach(file => {
  assert(fs.existsSync(path.join(rootDir, file)), `File exists: ${file}`);
});

console.log(`\n========================================`);
console.log(`Test Results: ${passCount} Passed, ${failCount} Failed`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 All file structure and code module assertions passed successfully!');
  process.exit(0);
}
