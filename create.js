/*
  KAMBAC Livestock Management System
  XianFire Model & Controller Generator
  Mindoro State University - Philippines / XianFire Framework
*/
import fs from 'fs/promises';
import path from 'path';

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
🚀 Sequelize Model & Express Controller Generator - XianFire

Usage:
  npm run create:model <ModelName>
  npm run create:controller <ControllerName>

Examples:
  npm run create:model HealthRecord
  npm run create:controller healthController
`);
  process.exit(0);
}

const type = args[0];
const name = args[1];

const ensureDir = async (dir) => {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

const toPascalCase = (str) => {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
};

const toCamelCase = (str) => {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const createModel = async (modelName) => {
  const pascalName = toPascalCase(modelName);
  const modelsDir = path.join(process.cwd(), 'app', 'models');
  await ensureDir(modelsDir);

  const filePath = path.join(modelsDir, `${pascalName}.js`);
  const content = `import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const ${pascalName} = sequelize.define('${pascalName}', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: '${pascalName.toLowerCase()}s',
  timestamps: true,
  underscored: true
});

export default ${pascalName};
`;

  await fs.writeFile(filePath, content);
  console.log(`✅ Model created: app/models/${pascalName}.js`);
};

const createController = async (controllerName) => {
  const camelName = toCamelCase(controllerName.replace(/Controller$/i, ''));
  const controllersDir = path.join(process.cwd(), 'app', 'controllers');
  await ensureDir(controllersDir);

  const filePath = path.join(controllersDir, `${camelName}Controller.js`);
  const content = `export const index = async (req, res) => {
  try {
    res.render('${camelName}/index', { title: '${toPascalCase(camelName)} Management' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const store = async (req, res) => {
  try {
    // Implement store logic
    res.status(201).json({ success: true, message: 'Created successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
`;

  await fs.writeFile(filePath, content);
  console.log(`✅ Controller created: app/controllers/${camelName}Controller.js`);
};

if (type === 'model') {
  createModel(name);
} else if (type === 'controller') {
  createController(name);
} else {
  console.log('Invalid type. Use model or controller.');
}
