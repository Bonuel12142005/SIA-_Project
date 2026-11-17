import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const LivestockHealthRecord = sequelize.define('LivestockHealthRecord', {
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
  health_condition: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  treatment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  record_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'livestock_health_records',
  timestamps: true,
  updatedAt: false, // only created_at requested
  underscored: true
});

export default LivestockHealthRecord;
