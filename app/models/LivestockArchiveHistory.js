import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const LivestockArchiveHistory = sequelize.define('LivestockArchiveHistory', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  livestock_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: {
      model: 'livestock',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  action: {
    type: DataTypes.ENUM('archived', 'restored'),
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  action_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  performed_by: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'livestock_archive_history',
  timestamps: false,
  underscored: true
});

export default LivestockArchiveHistory;
