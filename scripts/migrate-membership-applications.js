import { DataTypes } from "sequelize";
import { User, sequelize } from "../models/userModel.js";
import { Member } from "../models/memberModel.js";
import { MemberApplication } from "../models/memberApplicationModel.js";

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) =>
    String(typeof table === "object" ? table.tableName : table).toLowerCase() === String(tableName).toLowerCase()
  );
};

const addMissingColumns = async (queryInterface, tableName, definitions) => {
  if (!await tableExists(queryInterface, tableName)) {
    throw new Error(`Required table ${tableName} does not exist. Run the existing model setup first.`);
  }
  const columns = await queryInterface.describeTable(tableName);
  for (const [name, definition] of Object.entries(definitions)) {
    if (!columns[name]) await queryInterface.addColumn(tableName, name, definition);
  }
};

const run = async () => {
  await sequelize.authenticate();
  await sequelize.sync();
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.changeColumn(User.getTableName(), "status", {
    type: DataTypes.ENUM("Active", "Inactive", "Pending"),
    allowNull: false,
    defaultValue: "Active"
  });
  await queryInterface.changeColumn(Member.getTableName(), "status", {
    type: DataTypes.ENUM("Active", "Inactive", "Suspended", "Pending"),
    allowNull: false,
    defaultValue: "Active"
  });

  await addMissingColumns(queryInterface, Member.getTableName(), {
    middleName: { type: DataTypes.STRING(60), allowNull: true },
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
    signatureName: { type: DataTypes.STRING(120), allowNull: true },
    signedAt: { type: DataTypes.DATEONLY, allowNull: true }
  });

  await addMissingColumns(queryInterface, MemberApplication.getTableName(), {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: User.getTableName(), key: "id" },
      onDelete: "SET NULL"
    },
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
    signedAt: { type: DataTypes.DATEONLY, allowNull: true }
  });
  await queryInterface.changeColumn(MemberApplication.getTableName(), "password", {
    type: DataTypes.STRING,
    allowNull: true
  });

  const indexes = await queryInterface.showIndex(MemberApplication.getTableName());
  if (!indexes.some((index) => index.unique && index.fields.some((field) =>
    (typeof field === "string" ? field : field.attribute || field.name) === "userId"
  ))) {
    await queryInterface.addIndex(MemberApplication.getTableName(), ["userId"], {
      unique: true,
      name: "member_applications_user_id_unique"
    });
  }
  console.log("Membership application fields and pending account statuses are ready.");
};

try {
  await run();
} catch (error) {
  console.error("Membership application migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
