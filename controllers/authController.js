
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
import {
  membershipFormValues,
  membershipToday,
  normalizeMembershipForm,
  validateMembershipForm
} from "./membershipForm.js";
import QRCode from "qrcode";
await sequelize.sync();

const addOneYear = (date) => {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCFullYear(result.getUTCFullYear() + 1);
  return result.toISOString().slice(0, 10);
};

export const loginPage = (req, res) => res.render("login", { title: "Member Sign In" });
export const registerPage = (req, res) => res.render("register", { title: "Create member account" });
export const forgotPasswordPage = (req, res) => res.render("forgotpassword", { title: "Forgot Password" });
export const dashboardPage = async (req, res, next) => {
  if (!req.session.userId) return res.redirect("/login");
  try {
    const user = await User.findByPk(req.session.userId, {
      attributes: ["id", "name", "role", "status", "memberId", "membershipDate"]
    });
    if (!user) return req.session.destroy(() => res.redirect("/login"));
    if (user.role === "member" && user.status === "Pending") return res.redirect("/member/application");
    if (user.role === "member" && user.status !== "Active") return res.status(403).send("This member account is not active.");
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
          member.isPending = member.status === "Pending";
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
    if (user.status === "Pending") return res.redirect("/member/application");
    if (user.status !== "Active") return res.status(403).send("This member account is not active.");
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
    if (user.status === "Pending") return res.redirect("/member/application");
    if (user.status !== "Active") return res.status(403).send("This member account is not active.");
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
    if (user.status === "Pending") return res.redirect("/member/application");
    if (user.status !== "Active") return res.status(403).send("This member account is not active.");
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
    if (!user || !["Active", "Pending"].includes(user.status)) return renderLoginError("We couldn't sign you in with those details.");
    const match = await bcrypt.compare(password, user.password);
    if (!match) return renderLoginError("We couldn't sign you in with those details.");
    return req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.userId = user.id;
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        return res.redirect(user.status === "Pending" ? "/member/application" : "/dashboard");
      });
    });
  } catch (error) {
    return next(error);
  }
};

export const registerUser = async (req, res, next) => {
  const { name, username, email, password } = req.body;
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 120 ||
      typeof username !== "string" || !/^[a-zA-Z0-9._-]{3,32}$/.test(username.trim()) ||
      typeof email !== "string" || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== "string" || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).render("register", {
      title: "Create member account",
      errorMessage: "Enter a valid name, username, email, and password of 12-72 UTF-8 bytes.",
      form: {
        name: typeof name === "string" ? name : "",
        username: typeof username === "string" ? username : "",
        email: typeof email === "string" ? email : ""
      }
    });
  }
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  const renderRegistrationError = (message) => res.status(409).render("register", {
    title: "Create member account",
    errorMessage: message,
    form: { name: name.trim(), username: username.trim(), email: email.trim() }
  });
  try {
    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email: normalizedEmail }, { username: normalizedUsername }] }
    });
    if (existingUser) return renderRegistrationError("That username or email address is already registered.");
    const hashed = await bcrypt.hash(password, 12);
    const pendingApplication = await MemberApplication.findOne({
      where: {
        status: "Pending",
        [Op.or]: [{ email: normalizedEmail }, { username: normalizedUsername }]
      }
    });
    if (pendingApplication) return renderRegistrationError("An application with that username or email address is already awaiting review.");
    const user = await User.create({
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashed,
      role: "member",
      status: "Pending"
    });
    return req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.userId = user.id;
      return req.session.save((saveError) => {
        if (saveError) return next(saveError);
        return res.redirect("/member/application");
      });
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) return renderRegistrationError("That username or email address is already registered.");
    return next(error);
  }
};

export const membershipApplicationPage = async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect("/login");
    const user = await User.findByPk(req.session.userId);
    if (!user) return req.session.destroy(() => res.redirect("/login"));
    if (user.role !== "member") return res.status(403).send("Membership applications are only available to member accounts.");
    if (user.status === "Active") return res.redirect("/dashboard");
    if (user.status !== "Pending") return res.status(403).send("This member account is not eligible to submit an application.");

    const current = user.get({ plain: true });
    if (user.memberId) {
      return res.render("member-application", {
        title: "Membership application",
        current,
        applicationSubmitted: true,
        applicationStatus: "pending review"
      });
    }

    const existingApplication = await MemberApplication.findOne({ where: { userId: user.id } });
    if (existingApplication) {
      return res.render("member-application", {
        title: "Membership application",
        current,
        applicationSubmitted: true,
        applicationStatus: existingApplication.status === "Pending" ? "pending review" : existingApplication.status.toLowerCase()
      });
    }
    const nameParts = user.name.trim().split(/\s+/);
    const application = membershipFormValues({
      firstName: nameParts.shift() || "",
      middleName: "",
      lastName: nameParts.join(" "),
      suffix: "",
      address: "",
      barangay: "",
      municipality: "",
      province: "",
      contactNumber: user.contactNumber || "",
      birthDate: "",
      placeOfBirth: "",
      sex: "",
      civilStatus: "",
      spouseName: "",
      spouseOccupation: "",
      fatherName: "",
      motherName: "",
      numberOfChildren: "",
      occupation: "",
      employer: "",
      memberType: "",
      membershipDate: membershipToday(),
      signatureName: user.name,
      signedAt: membershipToday()
    });
    return res.render("member-application", {
      title: "Membership application",
      current,
      accountEmail: user.email,
      application,
      today: membershipToday(),
      errors: {}
    });
  } catch (error) {
    next(error);
  }
};

export const submitMembershipApplication = async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect("/login");
    const user = await User.findByPk(req.session.userId);
    if (!user) return req.session.destroy(() => res.redirect("/login"));
    if (user.role !== "member") return res.status(403).send("Membership applications are only available to member accounts.");
    if (user.status !== "Pending") return user.status === "Active" ? res.redirect("/dashboard") : res.status(403).send("This member account is not eligible to submit an application.");
    if (user.memberId) return res.redirect("/member/application");

    const existingApplication = await MemberApplication.findOne({ where: { userId: user.id } });
    if (existingApplication) return res.redirect("/member/application");
    const application = normalizeMembershipForm(req.body);
    const errors = validateMembershipForm(application);
    const renderForm = (status) => res.status(status).render("member-application", {
      title: "Membership application",
      current: user.get({ plain: true }),
      accountEmail: user.email,
      application: membershipFormValues(application),
      errors,
      today: membershipToday()
    });
    if (Object.keys(errors).length) return renderForm(400);

    const formData = membershipFormValues(application);
    const name = formData.name;
    await sequelize.transaction(async (transaction) => {
      await MemberApplication.create({
        ...formData,
        userId: user.id,
        name,
        username: user.username,
        email: user.email,
        password: null,
        status: "Pending"
      }, { transaction });
      await user.update({
        name,
        contactNumber: application.contactNumber,
        address: formData.address,
        membershipDate: formData.membershipDate,
        status: "Pending"
      }, { transaction });
      await AuditLog.create({
        actorId: user.id,
        actorName: name,
        action: "submitted",
        entityType: "membership_application",
        entityId: String(user.id),
        details: "Submitted a membership application for administrator review."
      }, { transaction });
    });
    return res.redirect("/member/application");
  } catch (error) {
    if (error instanceof UniqueConstraintError) return res.redirect("/member/application");
    next(error);
  }
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
      attributes: [
        "id", "userId", "name", "username", "email", "contactNumber", "address",
        "firstName", "middleName", "lastName", "suffix", "barangay", "municipality", "province",
        "birthDate", "placeOfBirth", "sex", "civilStatus", "spouseName", "spouseOccupation",
        "fatherName", "motherName", "numberOfChildren", "occupation", "employer", "memberType",
        "membershipDate", "signatureName", "signedAt", "createdAt"
      ],
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
      const membershipDate = applicationData.membershipDate || new Date().toISOString().slice(0, 10);
      const member = await Member.create({
        firstName: applicationData.firstName || nameParts.shift() || "Member",
        middleName: applicationData.middleName || null,
        lastName: applicationData.lastName || nameParts.join(" ") || "Member",
        suffix: applicationData.suffix || null,
        address: applicationData.address,
        barangay: applicationData.barangay,
        municipality: applicationData.municipality,
        province: applicationData.province,
        contactNumber: applicationData.contactNumber,
        birthDate: applicationData.birthDate || null,
        placeOfBirth: applicationData.placeOfBirth,
        sex: applicationData.sex,
        civilStatus: applicationData.civilStatus,
        spouseName: applicationData.spouseName,
        spouseOccupation: applicationData.spouseOccupation,
        fatherName: applicationData.fatherName,
        motherName: applicationData.motherName,
        numberOfChildren: applicationData.numberOfChildren,
        occupation: applicationData.occupation,
        employer: applicationData.employer,
        memberType: applicationData.memberType,
        membershipDate,
        signatureName: applicationData.signatureName,
        signedAt: applicationData.signedAt || null,
        status: "Active"
      }, { transaction });
      if (applicationData.userId) {
        const user = await User.findByPk(applicationData.userId, { transaction });
        if (!user) throw new Error("The member account linked to this application no longer exists.");
        await user.update({
          name: applicationData.name,
          memberId: member.memberId,
          contactNumber: applicationData.contactNumber,
          address: applicationData.address,
          membershipDate,
          status: "Active"
        }, { transaction });
      } else {
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
      }
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
        password: null,
        reviewedBy: current.id,
        reviewedAt: new Date()
      }, { transaction });
      if (application.userId) {
        const user = await User.findByPk(application.userId, { transaction });
        if (user) await user.update({ status: "Inactive" }, { transaction });
      }
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
