import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const Member = sequelize.define('Member', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  member_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  contact_number: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  membership_status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending'),
    defaultValue: 'active',
    allowNull: false
  }
}, {
  tableName: 'members',
  timestamps: true,
  underscored: true
});

export default Member;
