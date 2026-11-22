import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Product = sequelize.define("Product", {
  productCode: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  productName: { type: DataTypes.STRING(150), allowNull: false },
  category: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  unit: { type: DataTypes.STRING(30), allowNull: false },
  price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  imagePath: { type: DataTypes.STRING(255), allowNull: true },
  deletedAt: { type: DataTypes.DATE, allowNull: true },
  status: { type: DataTypes.ENUM("active", "inactive"), allowNull: false, defaultValue: "active" }
}, {
  paranoid: true
});
