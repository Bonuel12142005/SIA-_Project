import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Member = sequelize.define("Member", {
  memberId: { type: DataTypes.STRING(20), allowNull: true, unique: true },
  firstName: { type: DataTypes.STRING(60), allowNull: true },
  middleName: { type: DataTypes.STRING(60), allowNull: true },
  lastName: { type: DataTypes.STRING(60), allowNull: true },
  suffix: { type: DataTypes.STRING(20), allowNull: true },
  fullName: { type: DataTypes.STRING(120), allowNull: true },
  address: { type: DataTypes.STRING(1000), allowNull: false, defaultValue: "Carmundo, Bongabong, Oriental Mindoro" },
  barangay: { type: DataTypes.STRING(100), allowNull: true },
  municipality: { type: DataTypes.STRING(100), allowNull: true },
  province: { type: DataTypes.STRING(100), allowNull: true },
  contactNumber: { type: DataTypes.STRING(40), allowNull: true },
  contactDetails: { type: DataTypes.STRING(120), allowNull: true },
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
  membershipDate: { type: DataTypes.DATEONLY, allowNull: false },
  status: {
    type: DataTypes.ENUM("Active", "Inactive", "Suspended", "Pending"),
    allowNull: false,
    defaultValue: "Active"
  },
  signatureName: { type: DataTypes.STRING(120), allowNull: true },
  signedAt: { type: DataTypes.DATEONLY, allowNull: true }
}, {
  tableName: "tbl_members",
  timestamps: true,
  paranoid: true,
  deletedAt: "archivedAt",
  hooks: {
    beforeValidate: (member) => {
      if (member.firstName) member.firstName = member.firstName.trim();
      if (member.middleName) member.middleName = member.middleName.trim();
      if (member.lastName) member.lastName = member.lastName.trim();
      if (member.suffix) member.suffix = member.suffix.trim();
      if (member.firstName || member.middleName || member.lastName) {
        member.fullName = [member.firstName, member.middleName, member.lastName, member.suffix].filter(Boolean).join(" ");
      }
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
