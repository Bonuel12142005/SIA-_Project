
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
import { Op, UniqueConstraintError } from "sequelize";
import { User, sequelize } from "../models/userModel.js";
import { Member } from "../models/memberModel.js";
import { MemberApplication } from "../models/memberApplicationModel.js";
import { AuditLog } from "../models/auditLogModel.js";
import { MembershipPayment } from "../models/membershipPaymentModel.js";
import QRCode from "qrcode";
await sequelize.sync();

const addOneYear = (date) => {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCFullYear(result.getUTCFullYear() + 1);
  return result.toISOString().slice(0, 10);
};

export const loginPage = (req, res) => res.render("login", {
  title: "Member Sign In",
  registrationSubmitted: req.query.registered === "1"
});
export const registerPage = (req, res) => res.render("register", { title: "Register" });
export const forgotPasswordPage = (req, res) => res.render("forgotpassword", { title: "Forgot Password" });
export const dashboardPage = async (req, res, next) => {
  if (!req.session.userId) return res.redirect("/login");
  try {
    const user = await User.findByPk(req.session.userId, {
      attributes: ["id", "name", "role", "status", "memberId", "membershipDate"]
    });
    if (!user) return req.session.destroy(() => res.redirect("/login"));
    const current = user.get({ plain: true });
    const currentInitials = current.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    const isAdmin = current.role === "admin";
    current.roleLabel = isAdmin ? "Administrator" : "Member";
    if (!isAdmin && current.memberId) {
      const member = await Member.findOne({ where: { memberId: current.memberId } });
      if (member) {
        current.status = member.status;
        current.membershipDate = member.membershipDate;
        const latestPayment = await MembershipPayment.findOne({
          where: { memberRecordId: member.id },
          order: [["paidAt", "DESC"], ["id", "DESC"]]
        });
        current.renewalDate = latestPayment?.validUntil || addOneYear(member.membershipDate);
        current.renewalLabel = current.renewalDate < new Date().toISOString().slice(0, 10) ? "Renewal overdue" : "Valid through";
      }
    }
    current.isActive = current.status === "Active";
    if (isAdmin) {
      const [totalMembers, activeMembers, inactiveMembers, suspendedMembers, pendingApplications, recentMembers] = await Promise.all([
        Member.count(),
        Member.count({ where: { status: "Active" } }),
        Member.count({ where: { status: "Inactive" } }),
        Member.count({ where: { status: "Suspended" } }),
        MemberApplication.count({ where: { status: "Pending" } }),
        Member.findAll({
          attributes: ["id", "memberId", "firstName", "lastName", "status", "membershipDate"],
          order: [["createdAt", "DESC"], ["id", "DESC"]],
          limit: 5
        })
      ]);
      return res.render("dashboard", {
        title: "Dashboard",
        current,
        currentInitials,
        isAdmin,
        totalMembers,
        activeMembers,
        inactiveMembers,
        suspendedMembers,
        pendingApplications,
        recentMembers: recentMembers.map((instance) => {
          const member = instance.get({ plain: true });
          member.initials = [member.firstName, member.lastName].filter(Boolean).map((part) => part[0]).join("").toUpperCase();
          member.isActive = member.status === "Active";
          member.isSuspended = member.status === "Suspended";
          return member;
        })
      });
    }
    return res.render("dashboard", { title: "Dashboard", current, currentInitials, isAdmin });
  } catch (error) {
    next(error);
  }
};

export const dashboardPreviewPage = (req, res) => {
  const current = { name: "Demo Officer", role: "Preview only" };
  const currentInitials = "DO";
  return res.render("dashboard", {
    title: "Dashboard Preview",
    current,
    currentInitials,
    previewMode: true
  });
};

export const memberIdCardPage = async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect("/login");
    const user = await User.findByPk(req.session.userId, {
      attributes: ["id", "name", "role", "status", "memberId", "membershipDate"]
    });
    if (!user) return req.session.destroy(() => res.redirect("/login"));
    if (user.role === "admin") return res.status(403).send("Digital member ID cards are available to member accounts.");
    if (!user.memberId) return res.status(409).send("Your member ID is not available. Contact a KAMBAC administrator.");
    const current = user.get({ plain: true });
    const member = await Member.findOne({ where: { memberId: current.memberId } });
    if (member) {
      current.status = member.status;
      current.membershipDate = member.membershipDate;
    }
    current.isActive = current.status === "Active";
    const qrCode = await QRCode.toDataURL(current.memberId, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
      color: { dark: "#24352a", light: "#ffffff" }
    });
    return res.render("member-id-card", {
      title: "Digital Member ID",
      current,
      currentInitials: current.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
      qrCode
    });
  } catch (error) {
    next(error);
  }
};

export const memberProfilePage = async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect("/login");
    const user = await User.findByPk(req.session.userId, {
      attributes: ["id", "name", "email", "username", "role", "status", "memberId", "contactNumber", "address"]
    });
    if (!user) return req.session.destroy(() => res.redirect("/login"));
    if (user.role === "admin") return res.status(403).send("Member profile settings are only available to member accounts.");
    const current = user.get({ plain: true });
    current.roleLabel = "Member";
    return res.render("member-account", {
      title: "My profile",
      current,
      currentInitials: current.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
    });
  } catch (error) {
    next(error);
  }
};

export const updateMemberProfile = async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect("/login");
    const user = await User.findByPk(req.session.userId);
    if (!user) return req.session.destroy(() => res.redirect("/login"));
    if (user.role === "admin") return res.status(403).send("Member profile settings are only available to member accounts.");
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const contactNumber = typeof req.body.contactNumber === "string" ? req.body.contactNumber.trim() : "";
    const address = typeof req.body.address === "string" ? req.body.address.trim() : "";
    if (name.length < 2 || name.length > 120 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !/^[+\d()\s.-]{7,40}$/.test(contactNumber) || contactNumber.replace(/\D/g, "").length < 7 ||
        address.length < 5 || address.length > 500) {
      return res.status(400).render("member-account", {
        title: "My profile",
        current: { ...user.get({ plain: true }), name, email, contactNumber, address },
        currentInitials: user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
        errorMessage: "Enter a valid name, email, contact number, and address."
      });
    }
    const duplicateEmail = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
    if (duplicateEmail) {
      return res.status(409).render("member-account", {
        title: "My profile",
        current: { ...user.get({ plain: true }), name, email, contactNumber, address },
        currentInitials: user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
        errorMessage: "That email address is already associated with another account."
      });
    }
    await sequelize.transaction(async (transaction) => {
      await user.update({ name, email, contactNumber, address }, { transaction });
      if (user.memberId) {
        const member = await Member.findOne({ where: { memberId: user.memberId }, transaction });
        if (member) {
          const nameParts = name.split(/\s+/);
          await member.update({
            firstName: nameParts.shift() || "Member",
            lastName: nameParts.join(" ") || "Member",
            fullName: name,
            contactNumber,
            address
          }, { transaction });
        }
      }
      await AuditLog.create({
        actorId: user.id,
        actorName: name,
        action: "updated",
        entityType: "member_profile",
        entityId: String(user.id),
        details: "Member updated their profile details."
      }, { transaction });
    });
    return res.redirect("/member/profile");
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  const { identifier, email, password } = req.body;
  const loginIdentifier = typeof identifier === "string" ? identifier.trim() : typeof email === "string" ? email.trim() : "";
  const renderLoginError = (message, status = 401) =>
    res.status(status).render("login", { title: "Member Sign In", errorMessage: message, loginIdentifier });
  if (!loginIdentifier || typeof password !== "string") {
    return renderLoginError("Enter your username or Member ID and password.", 400);
  }
  try {
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: loginIdentifier.toLowerCase() },
          { username: loginIdentifier.toLowerCase() },
          { memberId: loginIdentifier.toUpperCase() }
        ]
      }
    });
    if (!user || user.status !== "Active") return renderLoginError("We couldn't sign you in with those details.");
    const match = await bcrypt.compare(password, user.password);
    if (!match) return renderLoginError("We couldn't sign you in with those details.");
    return req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.userId = user.id;
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        return res.redirect("/dashboard");
      });
    });
  } catch (error) {
    return next(error);
  }
};

export const registerUser = async (req, res, next) => {
  const { name, username, email, password, contactNumber, address } = req.body;
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 120 ||
      typeof username !== "string" || !/^[a-zA-Z0-9._-]{3,32}$/.test(username.trim()) ||
      typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72 ||
      typeof contactNumber !== "string" || !/^[+\d()\s.-]{7,40}$/.test(contactNumber.trim()) || contactNumber.trim().replace(/\D/g, "").length < 7 ||
      typeof address !== "string" || address.trim().length < 5 || address.trim().length > 500) {
    return res.status(400).send("Enter a valid username, name, email, contact number, address, and password.");
  }
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email: normalizedEmail }, { username: normalizedUsername }] }
    });
    if (existingUser) return res.status(409).send("That username or email address is already registered.");
    const hashed = await bcrypt.hash(password, 10);
    const pendingApplication = await MemberApplication.findOne({
      where: {
        status: "Pending",
        [Op.or]: [{ email: normalizedEmail }, { username: normalizedUsername }]
      }
    });
    if (pendingApplication) return res.status(409).send("An application with that username or email address is already awaiting review.");
    await MemberApplication.create({
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashed,
      contactNumber: contactNumber.trim(),
      address: address.trim()
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) return res.status(409).send("That username or email address is already registered.");
    return next(error);
  }
  return res.redirect("/login?registered=1");
};

const requireAdmin = async (req, res) => {
  if (!req.session.userId) {
    res.redirect("/login");
    return null;
  }
  const user = await User.findByPk(req.session.userId, { attributes: ["id", "name", "role"] });
  if (!user) {
    req.session.destroy(() => res.redirect("/login"));
    return null;
  }
  if (user.role !== "admin") {
    res.status(403).send("Administrator access is required.");
    return null;
  }
  return user;
};

export const applicationsPage = async (req, res, next) => {
  try {
    const currentUser = await requireAdmin(req, res);
    if (!currentUser) return;
    const applications = await MemberApplication.findAll({
      where: { status: "Pending" },
      attributes: ["id", "name", "username", "email", "contactNumber", "address", "createdAt"],
      order: [["createdAt", "ASC"]]
    });
    const current = currentUser.get({ plain: true });
    return res.render("applications", {
      title: "Membership applications",
      current,
      currentInitials: current.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
      applications: applications.map((instance) => {
        const application = instance.get({ plain: true });
        application.initials = application.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
        return application;
      }),
      pendingCount: applications.length
    });
  } catch (error) {
    next(error);
  }
};

export const approveApplication = async (req, res, next) => {
  try {
    const current = await requireAdmin(req, res);
    if (!current) return;
    if (!/^\d+$/.test(req.params.id)) return res.sendStatus(404);
    const application = await MemberApplication.findByPk(req.params.id);
    if (!application || application.status !== "Pending") return res.sendStatus(404);
    const transaction = await sequelize.transaction();
    try {
      const applicationData = application.get({ plain: true });
      const nameParts = applicationData.name.trim().split(/\s+/);
      const membershipDate = new Date().toISOString().slice(0, 10);
      const member = await Member.create({
        firstName: nameParts.shift() || "Member",
        lastName: nameParts.join(" ") || "Member",
        address: applicationData.address,
        contactNumber: applicationData.contactNumber,
        membershipDate,
        status: "Active"
      }, { transaction });
      await User.create({
        name: applicationData.name,
        username: applicationData.username,
        email: applicationData.email,
        password: applicationData.password,
        role: "member",
        memberId: member.memberId,
        contactNumber: applicationData.contactNumber,
        address: applicationData.address,
        membershipDate,
        status: "Active"
      }, { transaction });
      await application.update({
        status: "Approved",
        reviewedBy: current.id,
        reviewedAt: new Date()
      }, { transaction });
      await AuditLog.create({
        actorId: current.id,
        actorName: current.name,
        action: "approved",
        entityType: "membership_application",
        entityId: String(application.id),
        details: `Approved member account ${applicationData.username} (${member.memberId}).`
      }, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      if (error instanceof UniqueConstraintError) {
        return res.status(409).send("This application conflicts with an existing member record. Review the account details before approving.");
      }
      throw error;
    }
    return res.redirect("/admin/applications");
  } catch (error) {
    next(error);
  }
};

export const rejectApplication = async (req, res, next) => {
  try {
    const current = await requireAdmin(req, res);
    if (!current) return;
    if (!/^\d+$/.test(req.params.id)) return res.sendStatus(404);
    const application = await MemberApplication.findByPk(req.params.id);
    if (!application || application.status !== "Pending") return res.sendStatus(404);
    await sequelize.transaction(async (transaction) => {
      await application.update({
        status: "Rejected",
        password: "REJECTED",
        reviewedBy: current.id,
        reviewedAt: new Date()
      }, { transaction });
      await AuditLog.create({
        actorId: current.id,
        actorName: current.name,
        action: "rejected",
        entityType: "membership_application",
        entityId: String(application.id),
        details: `Rejected member application ${application.username}.`
      }, { transaction });
    });
    return res.redirect("/admin/applications");
  } catch (error) {
    next(error);
  }
};

export const auditLogPage = async (req, res, next) => {
  try {
    const currentUser = await requireAdmin(req, res);
    if (!currentUser) return;
    const entries = await AuditLog.findAll({ order: [["createdAt", "DESC"]], limit: 100 });
    const current = currentUser.get({ plain: true });
    return res.render("audit-log", {
      title: "System audit trail",
      current,
      currentInitials: current.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
      entries: entries.map((entry) => entry.get({ plain: true }))
    });
  } catch (error) {
    next(error);
  }
};

export const logoutUser = (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("connect.sid");
    return res.redirect("/login");
  });
};
