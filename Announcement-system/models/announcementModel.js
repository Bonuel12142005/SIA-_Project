import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Announcement = sequelize.define("Announcement", {
  title: { type: DataTypes.STRING(255), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'general' },
  priority: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'normal' },
  publishDate: { type: DataTypes.DATE, allowNull: true },
  expiryDate: { type: DataTypes.DATE, allowNull: true },
  pinned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  sendNotification: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  eventDate: { type: DataTypes.DATE, allowNull: true },
  eventTime: { type: DataTypes.STRING, allowNull: true },
  eventLocation: { type: DataTypes.STRING, allowNull: true },
  viewCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM("draft", "published"),
    allowNull: false,
    defaultValue: "published"
  },
  publishedAt: { type: DataTypes.DATE, allowNull: true },
  creatorId: { type: DataTypes.INTEGER, allowNull: true },
  audience: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "all" },
  recipientIds: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
  recipientRoles: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
  archivedAt: { type: DataTypes.DATE, allowNull: true },
  deletedAt: { type: DataTypes.DATE, allowNull: true }
});

