import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const MemberApplication = sequelize.define("MemberApplication", {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: true,
    references: { model: "Users", key: "id" },
    onDelete: "SET NULL"
  },
  name: { type: DataTypes.STRING(120), allowNull: false },
  username: { type: DataTypes.STRING(32), allowNull: false },
  email: { type: DataTypes.STRING(254), allowNull: false },
  password: { type: DataTypes.STRING, allowNull: true },
  contactNumber: { type: DataTypes.STRING(40), allowNull: false },
  address: { type: DataTypes.TEXT, allowNull: false },
  firstName: { type: DataTypes.STRING(60), allowNull: true },
  middleName: { type: DataTypes.STRING(60), allowNull: true },
  lastName: { type: DataTypes.STRING(60), allowNull: true },
  suffix: { type: DataTypes.STRING(20), allowNull: true },
  barangay: { type: DataTypes.STRING(100), allowNull: true },
  municipality: { type: DataTypes.STRING(100), allowNull: true },
  province: { type: DataTypes.STRING(100), allowNull: true },
  birthDate: { type: DataTypes.DATEONLY, allowNull: true },
  placeOfBirth: { type: DataTypes.STRING(200), allowNull: true },
  sex: { type: DataTypes.STRING(30), allowNull: true },
  civilStatus: { type: DataTypes.STRING(30), allowNull: true },
  spouseName: { type: DataTypes.STRING(120), allowNull: true },
  spouseOccupation: { type: DataTypes.STRING(120), allowNull: true },
  fatherName: { type: DataTypes.STRING(120), allowNull: true },
  motherName: { type: DataTypes.STRING(120), allowNull: true },
  numberOfChildren: { type: DataTypes.INTEGER, allowNull: true },
  occupation: { type: DataTypes.STRING(120), allowNull: true },
  employer: { type: DataTypes.STRING(120), allowNull: true },
  memberType: { type: DataTypes.STRING(60), allowNull: true },
  membershipDate: { type: DataTypes.DATEONLY, allowNull: true },
  signatureName: { type: DataTypes.STRING(120), allowNull: true },
  signedAt: { type: DataTypes.DATEONLY, allowNull: true },
  status: {
    type: DataTypes.ENUM("Pending", "Approved", "Rejected"),
    allowNull: false,
    defaultValue: "Pending"
  },
  reviewedBy: { type: DataTypes.INTEGER, allowNull: true },
  reviewedAt: { type: DataTypes.DATE, allowNull: true }
}, {
  indexes: [
    { fields: ["status", "createdAt"] },
    { fields: ["email"] },
    { fields: ["username"] }
  ]
});
