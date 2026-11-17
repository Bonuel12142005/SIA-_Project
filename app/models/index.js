import { sequelize } from '../../config/database.js';
import User from './User.js';
import Member from './Member.js';
import Livestock from './Livestock.js';
import LivestockHealthRecord from './LivestockHealthRecord.js';
import LivestockWeightHistory from './LivestockWeightHistory.js';
import LivestockArchiveHistory from './LivestockArchiveHistory.js';

// Setup relationships
// 1. Member has many Livestock
Member.hasMany(Livestock, {
  foreignKey: 'member_id',
  as: 'livestock'
});
Livestock.belongsTo(Member, {
  foreignKey: 'member_id',
  as: 'owner'
});

// 2. Livestock has many Health Records
Livestock.hasMany(LivestockHealthRecord, {
  foreignKey: 'livestock_id',
  as: 'healthRecords'
});
LivestockHealthRecord.belongsTo(Livestock, {
  foreignKey: 'livestock_id',
  as: 'livestock'
});

// 3. Livestock has many Weight History records
Livestock.hasMany(LivestockWeightHistory, {
  foreignKey: 'livestock_id',
  as: 'weightHistory'
});
LivestockWeightHistory.belongsTo(Livestock, {
  foreignKey: 'livestock_id',
  as: 'livestock'
});

// 4. Livestock has many Archive History records
Livestock.hasMany(LivestockArchiveHistory, {
  foreignKey: 'livestock_id',
  as: 'archiveHistory'
});
LivestockArchiveHistory.belongsTo(Livestock, {
  foreignKey: 'livestock_id',
  as: 'livestock'
});

export {
  sequelize,
  User,
  Member,
  Livestock,
  LivestockHealthRecord,
  LivestockWeightHistory,
  LivestockArchiveHistory
};

export default {
  sequelize,
  User,
  Member,
  Livestock,
  LivestockHealthRecord,
  LivestockWeightHistory,
  LivestockArchiveHistory
};
