import { DataTypes } from "sequelize";
import { User, sequelize } from "../models/userModel.js";

const run = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = User.getTableName();
  const tables = await queryInterface.showAllTables();
  const exists = tables.some((table) =>
    String(typeof table === "object" ? table.tableName : table).toLowerCase() === String(tableName).toLowerCase()
  );
  if (!exists) {
    await User.sync();
    console.log("User table created with admin and member roles.");
    return;
  }

  await queryInterface.changeColumn(tableName, "role", {
    type: DataTypes.ENUM("admin", "staff", "visitors", "member"),
    allowNull: false,
    defaultValue: "member"
  });
  await queryInterface.bulkUpdate(tableName, { role: "admin" }, { role: "staff" });
  await queryInterface.bulkUpdate(tableName, { role: "member" }, { role: "visitors" });
  await queryInterface.changeColumn(tableName, "role", {
    type: DataTypes.ENUM("admin", "member"),
    allowNull: false,
    defaultValue: "member"
  });
  console.log("Legacy staff accounts are now admins and visitor accounts are now members.");
};

try {
  await sequelize.authenticate();
  await run();
} catch (error) {
  console.error("Member role migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
