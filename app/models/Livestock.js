import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const Livestock = sequelize.define('Livestock', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  livestock_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  member_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: {
      model: 'members',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  animal_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  animal_type: {
    type: DataTypes.STRING(50), // e.g. Cattle, Goat, Pig, Sheep, Carabao, Poultry
    allowNull: false
  },
  breed: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  sex: {
    type: DataTypes.ENUM('Male', 'Female', 'Unknown'),
    defaultValue: 'Male',
    allowNull: false
  },
  date_acquired: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  birth_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  initial_weight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  current_weight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  health_status: {
    type: DataTypes.ENUM('Healthy', 'Under Treatment', 'Critical', 'Needs Monitoring', 'Vaccinated'),
    defaultValue: 'Healthy',
    allowNull: false
  },
  estimated_value: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  image: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  archive_status: {
    type: DataTypes.ENUM('active', 'archived'),
    defaultValue: 'active',
    allowNull: false
  }
}, {
  tableName: 'livestock',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['livestock_code'], unique: true },
    { fields: ['member_id'] },
    { fields: ['archive_status'] },
    { fields: ['health_status'] },
    { fields: ['animal_type'] }
  ]
});

export default Livestock;
