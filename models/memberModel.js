import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Member = sequelize.define("Member", {
  memberId: { type: DataTypes.STRING(20), allowNull: true, unique: true },
  firstName: { type: DataTypes.STRING(60), allowNull: true },
  lastName: { type: DataTypes.STRING(60), allowNull: true },
  fullName: { type: DataTypes.STRING(120), allowNull: true },
  address: { type: DataTypes.STRING(1000), allowNull: false, defaultValue: "Carmundo, Bongabong, Oriental Mindoro" },
  contactNumber: { type: DataTypes.STRING(40), allowNull: true },
  contactDetails: { type: DataTypes.STRING(120), allowNull: true },
  membershipDate: { type: DataTypes.DATEONLY, allowNull: false },
  status: {
    type: DataTypes.ENUM("Active", "Inactive", "Suspended"),
    allowNull: false,
    defaultValue: "Active"
  }
}, {
  tableName: "tbl_members",
  timestamps: true,
  paranoid: true,
  deletedAt: "archivedAt",
  hooks: {
    beforeValidate: (member) => {
      if (member.firstName) member.firstName = member.firstName.trim();
      if (member.lastName) member.lastName = member.lastName.trim();
      if (member.firstName || member.lastName) member.fullName = [member.firstName, member.lastName].filter(Boolean).join(" ");
      if (member.contactNumber) member.contactDetails = member.contactNumber;
      if (member.address) member.address = member.address.trim();
      if (member.contactDetails) member.contactDetails = member.contactDetails.trim();
    },
    afterCreate: async (member, options) => {
      if (!member.memberId) {
        const year = member.membershipDate.slice(0, 4);
        member.memberId = `KMB-${year}-${String(member.id).padStart(4, "0")}`;
        await member.save({ fields: ["memberId", "fullName", "contactDetails"], hooks: false, transaction: options.transaction });
      }
    }
  }
});

export { sequelize };
