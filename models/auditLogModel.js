import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const AuditLog = sequelize.define("AuditLog", {
  actorId: { type: DataTypes.INTEGER, allowNull: true },
  actorName: { type: DataTypes.STRING(120), allowNull: false },
  action: { type: DataTypes.STRING(40), allowNull: false },
  entityType: { type: DataTypes.STRING(40), allowNull: false },
  entityId: { type: DataTypes.STRING(64), allowNull: false },
  details: { type: DataTypes.TEXT, allowNull: true }
}, {
  updatedAt: false,
  indexes: [{ fields: ["createdAt"] }, { fields: ["entityType", "entityId"] }]
});
