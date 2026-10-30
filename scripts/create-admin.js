import bcrypt from "bcrypt";
import inquirer from "inquirer";
import { Op } from "sequelize";
import { User, sequelize } from "../models/userModel.js";

const run = async () => {
  await sequelize.authenticate();
  await sequelize.sync();
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Administrator full name:",
      validate: (value) => value.trim().length >= 2 || "Enter at least 2 characters."
    },
    {
      type: "input",
      name: "username",
      message: "Administrator username:",
      validate: (value) => /^[a-zA-Z0-9._-]{3,32}$/.test(value.trim()) || "Use 3-32 letters, numbers, dots, dashes, or underscores."
    },
    {
      type: "input",
      name: "email",
      message: "Administrator email:",
      validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || "Enter a valid email address."
    },
    {
      type: "password",
      name: "password",
      message: "Administrator password (minimum 12 characters):",
      mask: "*",
      validate: (value) => value.length >= 12 && Buffer.byteLength(value, "utf8") <= 72 || "Use 12-72 UTF-8 bytes."
    }
  ]);
  const username = answers.username.trim().toLowerCase();
  const email = answers.email.trim().toLowerCase();
  const existing = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } });
  if (existing) throw new Error("An account already uses that username or email address.");
  await User.create({
    name: answers.name.trim(),
    username,
    email,
    password: await bcrypt.hash(answers.password, 12),
    role: "admin",
    status: "Active"
  });
  console.log(`Administrator account created for ${username}.`);
};

try {
  await run();
} catch (error) {
  console.error("Could not create administrator account:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
