import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const MembershipPayment = sequelize.define("MembershipPayment", {
  memberRecordId: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  paidAt: { type: DataTypes.DATEONLY, allowNull: false },
  validUntil: { type: DataTypes.DATEONLY, allowNull: false },
  receiptNumber: { type: DataTypes.STRING(80), allowNull: true },
  recordedBy: { type: DataTypes.INTEGER, allowNull: false }
}, {
  indexes: [{ fields: ["memberRecordId", "paidAt"] }, { fields: ["validUntil"] }]
});
