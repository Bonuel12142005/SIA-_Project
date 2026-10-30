
      /*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const User = sequelize.define("User", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, set(value) { this.setDataValue("email", value?.trim().toLowerCase()); } },
  username: { type: DataTypes.STRING(32), allowNull: true, set(value) { this.setDataValue("username", value?.trim().toLowerCase()); } },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM("admin", "member"), allowNull: false, defaultValue: "member" },
  memberId: { type: DataTypes.STRING(32), allowNull: true },
  contactNumber: { type: DataTypes.STRING(40), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  membershipDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.ENUM("Active", "Inactive"), allowNull: false, defaultValue: "Active" }
}, {
  hooks: {
    afterCreate: async (user, options) => {
      if (!user.memberId && user.role === "member") {
        const year = new Date(`${user.membershipDate}T00:00:00`).getFullYear();
        user.memberId = `KMB-${year}-${String(user.id).padStart(4, "0")}`;
        await user.save({ fields: ["memberId"], hooks: false, transaction: options.transaction });
      }
    }
  }
});
export { sequelize }; 
