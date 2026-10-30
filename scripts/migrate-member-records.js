import { DataTypes } from "sequelize";
import { User } from "../models/userModel.js";
import { Member, sequelize } from "../models/memberModel.js";

const migrate = async () => {
  await Member.sync();
  const queryInterface = sequelize.getQueryInterface();
  const tableName = Member.getTableName();
  const columns = await queryInterface.describeTable(tableName);
  const addIfMissing = async (name, definition) => {
    if (!columns[name]) await queryInterface.addColumn(tableName, name, definition);
  };
  await addIfMissing("firstName", { type: DataTypes.STRING(60), allowNull: true });
  await addIfMissing("lastName", { type: DataTypes.STRING(60), allowNull: true });
  await addIfMissing("contactNumber", { type: DataTypes.STRING(40), allowNull: true });
  await queryInterface.changeColumn(tableName, "fullName", { type: DataTypes.STRING(120), allowNull: true });
  await queryInterface.changeColumn(tableName, "address", {
    type: DataTypes.STRING(1000),
    allowNull: false,
    defaultValue: "Carmundo, Bongabong, Oriental Mindoro"
  });
  await queryInterface.changeColumn(tableName, "status", {
    type: DataTypes.ENUM("Active", "Inactive", "Suspended"),
    allowNull: false,
    defaultValue: "Active"
  });

  const existingRecords = await Member.findAll({ attributes: ["id", "firstName", "lastName", "fullName", "contactNumber", "contactDetails", "address"], paranoid: false });
  for (const record of existingRecords) {
    const parts = (record.fullName || "").trim().split(/\s+/).filter(Boolean);
    const firstName = record.firstName || parts.shift() || "Member";
    const lastName = record.lastName || parts.join(" ") || "Record";
    await record.update({
      firstName,
      lastName,
      contactNumber: record.contactNumber || record.contactDetails || "",
      address: record.address || "Carmundo, Bongabong, Oriental Mindoro"
    });
  }

  const existingMembers = new Set((await Member.findAll({ attributes: ["memberId"], paranoid: false }))
    .map((member) => member.memberId)
    .filter(Boolean));
  const users = await User.findAll({
    attributes: ["memberId", "name", "address", "contactNumber", "membershipDate", "status", "createdAt"]
  });

  let imported = 0;
  for (const user of users) {
    if (!user.memberId || existingMembers.has(user.memberId)) continue;
    const membershipDate = user.membershipDate ||
      (user.createdAt ? new Date(user.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    const status = ["Active", "Inactive", "Suspended"].includes(user.status) ? user.status : "Active";
    const nameParts = user.name.trim().split(/\s+/).filter(Boolean);
    await Member.create({
      memberId: user.memberId,
      firstName: nameParts.shift() || "Member",
      lastName: nameParts.join(" ") || "Record",
      address: user.address || "Carmundo, Bongabong, Oriental Mindoro",
      contactNumber: user.contactNumber || "",
      contactDetails: user.contactNumber,
      membershipDate,
      status
    });
    existingMembers.add(user.memberId);
    imported += 1;
  }
  console.log(`Member repository is ready. Migrated existing records and imported ${imported} login profile(s) into tbl_members.`);
};

try {
  await sequelize.authenticate();
  await migrate();
} catch (error) {
  console.error("Member repository migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
