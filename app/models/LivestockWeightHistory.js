import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const LivestockWeightHistory = sequelize.define('LivestockWeightHistory', {
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
  weight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  recorded_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'livestock_weight_history',
  timestamps: true,
  updatedAt: false, // only created_at requested
  underscored: true
});

export default LivestockWeightHistory;
