
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
    
import bcrypt from "bcrypt";
import { Op } from "sequelize";
import { User, sequelize } from "../models/userModel.js";
await sequelize.sync();
export const loginPage = (req, res) => {
  if (req.session.userId) return res.redirect("/products");
  res.render("login", { title: "Member Sign In" });
};
export const registerPage = (req, res) => res.render("register", { title: "Register" });
export const forgotPasswordPage = (req, res) => res.render("forgotpassword", { title: "Forgot Password" });

export const loginUser = async (req, res) => {
  const identifier = String(req.body.identifier || req.body.email || "").trim();
  const password = String(req.body.password || "");
  try {
    const user = await User.findOne({ where: { email: identifier } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).render("login", { identifier, pageError: "Incorrect email or password." });
    }
    req.session.regenerate((error) => {
      if (error) return res.status(500).render("login", { identifier, pageError: "Unable to sign in. Please try again." });
      req.session.userId = user.id;
      req.session.save((error) => {
        if (error) return res.status(500).render("login", { identifier, pageError: "Unable to sign in. Please try again." });
        res.redirect("/products");
      });
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    res.status(500).render("login", { identifier, pageError: "Unable to sign in. Please try again." });
  }
};

export const registerUser = async (req, res) => {
  const form = Object.fromEntries(["name", "username", "email", "contactNumber", "address"].map(key => [key, String(req.body[key] || "").trim()]));
  const password = String(req.body.password || "");
  const invalid = !/^[A-Za-z0-9._-]{3,32}$/.test(form.username) || !form.contactNumber || form.contactNumber.length > 30 || !form.address || form.address.length > 1000 || !form.name || form.name.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || form.email.length > 255 || password.length < 8 || Buffer.byteLength(password) > 72;
  if (invalid) return res.status(400).render("register", { form, pageError: "Complete all fields with valid details. Use a password of at least 8 characters (up to 72 bytes)." });
  try {
    const existing = await User.findOne({ where: { [Op.or]: [{ email: form.email }, { username: form.username }] } });
    if (existing) return res.status(409).render("register", { form, pageError: "That email address or username is already registered." });
    const user = await User.create({ ...form, password: await bcrypt.hash(password, 10) });
    req.session.regenerate((error) => {
      if (error) return res.redirect("/login");
      req.session.userId = user.id;
      req.session.save((error) => res.redirect(error ? "/login" : "/products"));
    });
  } catch (error) {
    console.error("Registration failed:", error.message);
    res.status(error.name === "SequelizeUniqueConstraintError" ? 409 : 500).render("register", { form, pageError: error.name === "SequelizeUniqueConstraintError" ? "That email address or username is already registered." : "Unable to create your account. Please try again." });
  }
};

export const logoutUser = (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
};
