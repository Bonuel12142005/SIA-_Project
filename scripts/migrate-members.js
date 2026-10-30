import { UniqueConstraintError, DataTypes } from "sequelize";
import { User, sequelize } from "../models/userModel.js";

const memberIdIndexName = "users_member_id_unique";
const emailIndexName = "users_email_unique";
const usernameIndexName = "users_username_unique";

const getIndexNames = async (queryInterface, tableName) => {
  const indexes = await queryInterface.showIndex(tableName);
  return indexes;
};

const hasUniqueIndex = (indexes, columnName) => indexes.some((index) =>
  index.unique && index.fields.some((field) =>
    (typeof field === "string" ? field : field.attribute || field.name) === columnName
  )
);

const run = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = User.getTableName();
  const tableNames = await queryInterface.showAllTables();
  const tableExists = tableNames.some((name) =>
    String(typeof name === "object" ? name.tableName : name).toLowerCase() === String(tableName).toLowerCase()
  );
  if (!tableExists) await sequelize.sync();

  const indexes = await getIndexNames(queryInterface, tableName);
  if (!hasUniqueIndex(indexes, "email")) {
    const duplicates = await sequelize.query(
      `SELECT email FROM ${sequelize.getQueryInterface().queryGenerator.quoteTable(tableName)} GROUP BY email HAVING COUNT(*) > 1 LIMIT 1`,
      { type: "SELECT" }
    );
    if (duplicates.length) {
      throw new Error(`Cannot add a unique email index: duplicate account email "${duplicates[0].email}" exists.`);
    }
    if (!hasUniqueIndex(indexes, "username")) {
      const duplicates = await sequelize.query(
        `SELECT username FROM ${queryInterface.queryGenerator.quoteTable(tableName)} WHERE username IS NOT NULL GROUP BY username HAVING COUNT(*) > 1 LIMIT 1`,
        { type: "SELECT" }
      );
      if (duplicates.length) {
        throw new Error(`Cannot add a unique username index: duplicate username "${duplicates[0].username}" exists.`);
      }
    }
  }

  const columns = await queryInterface.describeTable(tableName);
  const addIfMissing = async (name, definition) => {
    if (!columns[name]) await queryInterface.addColumn(tableName, name, definition);
  };

  await addIfMissing("memberId", { type: DataTypes.STRING(32), allowNull: true });
  await addIfMissing("username", { type: DataTypes.STRING(32), allowNull: true });
  await addIfMissing("contactNumber", { type: DataTypes.STRING(40), allowNull: true });
  await addIfMissing("address", { type: DataTypes.TEXT, allowNull: true });
  await addIfMissing("membershipDate", { type: DataTypes.DATEONLY, allowNull: true });
  await addIfMissing("status", {
    type: DataTypes.ENUM("Active", "Inactive"),
    allowNull: false,
    defaultValue: "Active"
  });

  const users = await User.findAll({ attributes: ["id", "memberId", "username", "name", "membershipDate", "createdAt"] });
  for (const user of users) {
    const membershipDate = user.membershipDate ||
      (user.createdAt ? new Date(user.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    const year = membershipDate.slice(0, 4);
    const memberId = user.memberId || `KMB-${year}-${String(user.id).padStart(4, "0")}`;
    const usernameSuffix = `.${user.id}`;
    const usernameBase = user.name.toLowerCase().replace(/[^a-z0-9._-]+/g, ".").replace(/^[._-]+|[._-]+$/g, "").slice(0, 32 - usernameSuffix.length) || "member";
    const username = user.username || `${usernameBase}${usernameSuffix}`;
    if (memberId !== user.memberId || membershipDate !== user.membershipDate || username !== user.username) {
      await user.update({ memberId, username, membershipDate });
    }
  }

  await queryInterface.changeColumn(tableName, "membershipDate", {
    type: DataTypes.DATEONLY,
    allowNull: false
  });
  const existingIndexes = await getIndexNames(queryInterface, tableName);
  if (!hasUniqueIndex(existingIndexes, "memberId")) {
    await queryInterface.addIndex(tableName, ["memberId"], { unique: true, name: memberIdIndexName });
  }
  if (!hasUniqueIndex(existingIndexes, "email")) {
    await queryInterface.addIndex(tableName, ["email"], { unique: true, name: emailIndexName });
  }
  if (!hasUniqueIndex(existingIndexes, "username")) {
    await queryInterface.addIndex(tableName, ["username"], { unique: true, name: usernameIndexName });
  }
};

try {
  await sequelize.authenticate();
  await run();
  console.log("Member fields are ready. Existing accounts received membership dates, member IDs, and usernames.");
} catch (error) {
  if (error instanceof UniqueConstraintError) {
    console.error("Member migration failed because existing records violate a required unique value:", error.message);
  } else {
    console.error("Member migration failed:", error.message);
  }
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
