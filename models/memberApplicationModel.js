import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const MemberApplication = sequelize.define("MemberApplication", {
  name: { type: DataTypes.STRING(120), allowNull: false },
  username: { type: DataTypes.STRING(32), allowNull: false },
  email: { type: DataTypes.STRING(254), allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  contactNumber: { type: DataTypes.STRING(40), allowNull: false },
  address: { type: DataTypes.TEXT, allowNull: false },
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
