import bcrypt from "bcrypt";
import { Op, UniqueConstraintError } from "sequelize";
import { User } from "../models/userModel.js";
import { Member, sequelize } from "../models/memberModel.js";
import { AuditLog } from "../models/auditLogModel.js";
import { MembershipPayment } from "../models/membershipPaymentModel.js";
import {
  membershipFormValues,
  membershipToday,
  normalizeMembershipForm,
  validateMembershipForm
} from "./membershipForm.js";

const MANAGER_ROLES = ["admin"];
const STATUSES = ["Active", "Inactive", "Suspended", "Pending"];
const TODAY = () => new Date().toISOString().slice(0, 10);
const PROFILE_FIELDS = [
  "id", "memberId", "firstName", "middleName", "lastName", "suffix", "fullName",
  "address", "barangay", "municipality", "province", "contactNumber", "contactDetails",
  "birthDate", "placeOfBirth", "sex", "civilStatus", "spouseName", "spouseOccupation",
  "fatherName", "motherName", "numberOfChildren", "occupation", "employer", "memberType",
  "membershipDate", "status", "signatureName", "signedAt", "createdAt", "updatedAt", "archivedAt"
];

const getCurrentUser = async (req) => {
  if (!req.session.userId) return null;
  const user = await User.findByPk(req.session.userId, { attributes: ["id", "name", "role"] });
  return user ? { ...user.get({ plain: true }), roleLabel: "Administrator" } : null;
};

const isManager = (user) => user && MANAGER_ROLES.includes(user.role);
const validMemberId = (value) => typeof value === "string" && /^KMB-\d{4}-\d{4,}$/.test(value);
const normalizeInput = (body) => ({
  ...normalizeMembershipForm(body),
  status: typeof body.status === "string" ? body.status : ""
});

const validateInput = (member, options) => {
  const errors = validateMembershipForm(member, options);
  if (!STATUSES.includes(member.status)) errors.status = "Choose Active, Pending, Inactive, or Suspended.";
  return errors;
};

const presentMember = (instance) => {
  const member = instance.get({ plain: true });
  const nameParts = [member.firstName, member.middleName, member.lastName, member.suffix].filter(Boolean);
  member.fullName = nameParts.join(" ") || member.fullName || "Unnamed member";
  member.contactNumber = member.contactNumber || member.contactDetails || "";
  member.initials = [member.firstName, member.lastName].filter(Boolean).map((part) => part[0]).join("").toUpperCase();
  member.isActive = member.status === "Active";
  member.isInactive = member.status === "Inactive";
  member.isSuspended = member.status === "Suspended";
  member.isPending = member.status === "Pending";
  member.isArchived = Boolean(member.archivedAt);
  member.membershipDateLabel = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${member.membershipDate}T00:00:00Z`));
  return member;
};

const renderForm = (res, { member, current, isEdit, errors = {}, status = 400 }) => {
  member.isActive = member.status === "Active";
  member.isInactive = member.status === "Inactive";
  member.isSuspended = member.status === "Suspended";
  member.isPending = member.status === "Pending";
  return res.status(status).render("member-form", {
    title: isEdit ? "Edit Member Profile" : "Register Member Profile",
    current,
    currentInitials: current.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
    member,
    application: membershipFormValues(member),
    isEdit,
    errors,
    today: TODAY()
  });
};

const requireManagerPage = async (req, res) => {
  if (!req.session.userId) {
    res.redirect("/login");
    return null;
  }
  const current = await getCurrentUser(req);
  if (!current) {
    req.session.destroy(() => res.redirect("/login"));
    return null;
  }
  if (!isManager(current)) {
    res.status(403).send("Administrator access is required to manage member profiles.");
    return null;
  }
  return current;
};

const requireManagerApi = async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Authentication required." });
    return null;
  }
  const current = await getCurrentUser(req);
  if (!current) {
    res.status(401).json({ error: "Authentication required." });
    return null;
  }
  if (!isManager(current)) {
    res.status(403).json({ error: "Administrator access is required to manage member profiles." });
    return null;
  }
  return current;
};

const parseListOptions = (query) => {
  const keyword = typeof query.keyword === "string" ? query.keyword : "";
  const searchValue = typeof query.search === "string" ? query.search : keyword;
  const search = searchValue.trim().slice(0, 100);
  const status = STATUSES.includes(query.status) ? query.status : "all";
  const archived = query.archived === "true";
  const requestedPage = /^\d+$/.test(String(query.page || "")) ? Number(query.page) : 1;
  const page = Number.isSafeInteger(requestedPage) ? Math.max(1, requestedPage) : 1;
  const requestedPageSize = Number(query.pageSize);
  const pageSize = [10, 25, 50].includes(requestedPageSize) ? requestedPageSize : 10;
  return { search, status, archived, page, pageSize };
};

const memberWhere = ({ search, status, archived }) => {
  const where = {};
  if (status !== "all") where.status = status;
  if (archived) where.archivedAt = { [Op.not]: null };
  if (search) {
    const keywords = search.split(/\s+/).filter(Boolean);
    where[Op.and] = keywords.map((keyword) => ({
      [Op.or]: ["memberId", "firstName", "lastName"].map((field) => ({
        [field]: { [Op.like]: `%${keyword}%` }
      }))
    }));
  }
  return where;
};

const listRecords = async (options) => {
  const where = memberWhere(options);
  const queryOptions = {
    attributes: PROFILE_FIELDS,
    where,
    order: [["createdAt", "DESC"], ["id", "DESC"]],
    limit: options.pageSize,
    offset: (options.page - 1) * options.pageSize,
    paranoid: !options.archived
  };
  const [result, totalMembers, activeMembers, pendingMembers, inactiveMembers, suspendedMembers, archivedMembers] = await Promise.all([
    Member.findAndCountAll(queryOptions),
    Member.count(),
    Member.count({ where: { status: "Active" } }),
    Member.count({ where: { status: "Pending" } }),
    Member.count({ where: { status: "Inactive" } }),
    Member.count({ where: { status: "Suspended" } }),
    Member.count({ paranoid: false, where: { archivedAt: { [Op.not]: null } } })
  ]);
  return {
    members: result.rows.map(presentMember),
    total: result.count,
    totalMembers,
    activeMembers,
    pendingMembers,
    inactiveMembers,
    suspendedMembers,
    archivedMembers,
    page: options.page,
    pageSize: options.pageSize,
    totalPages: Math.max(1, Math.ceil(result.count / options.pageSize))
  };
};

const renderMembersPage = async (req, res, next, archivedOnly = false) => {
  try {
    const current = await requireManagerPage(req, res);
    if (!current) return;
    const options = parseListOptions({ ...req.query, ...(archivedOnly ? { archived: "true" } : {}) });
    const data = await listRecords(options);
    return res.render("members", {
      title: "Member Management",
      current,
      currentInitials: current.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
      ...data,
      visibleCount: data.members.length,
      today: TODAY(),
      search: options.search,
      statusAll: options.status === "all",
      statusActive: options.status === "Active",
      statusPending: options.status === "Pending",
      statusInactive: options.status === "Inactive",
      statusSuspended: options.status === "Suspended",
      showingArchived: options.archived,
      previousPage: Math.max(1, options.page - 1),
      nextPage: Math.min(data.totalPages, options.page + 1),
      hasPrevious: options.page > 1,
      hasNext: options.page < data.totalPages,
      pageSize10: options.pageSize === 10,
      pageSize25: options.pageSize === 25,
      pageSize50: options.pageSize === 50,
      pageBaseUrl: `${options.archived ? "/members/archive" : "/members"}?status=${encodeURIComponent(options.status)}&search=${encodeURIComponent(options.search)}&pageSize=${options.pageSize}`
    });
  } catch (error) {
    next(error);
  }
};

export const membersPage = (req, res, next) => renderMembersPage(req, res, next);
export const archivedMembersPage = (req, res, next) => renderMembersPage(req, res, next, true);

const addOneYear = (date) => {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCFullYear(result.getUTCFullYear() + 1);
  return result.toISOString().slice(0, 10);
};

export const renewalsPage = async (req, res, next) => {
  try {
    const current = await requireManagerPage(req, res);
    if (!current) return;
    const records = await Member.findAll({
      attributes: PROFILE_FIELDS,
      order: [["lastName", "ASC"], ["firstName", "ASC"]]
    });
    const payments = records.length ? await MembershipPayment.findAll({
      where: { memberRecordId: { [Op.in]: records.map((member) => member.id) } },
      order: [["paidAt", "DESC"], ["id", "DESC"]]
    }) : [];
    const latestPayments = new Map();
    for (const payment of payments) {
      if (!latestPayments.has(payment.memberRecordId)) latestPayments.set(payment.memberRecordId, payment.get({ plain: true }));
    }
    const today = TODAY();
    const members = records.map((instance) => {
      const member = presentMember(instance);
      const payment = latestPayments.get(member.id);
      const renewalDate = payment?.validUntil || addOneYear(member.membershipDate);
      const daysRemaining = Math.ceil((Date.parse(`${renewalDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
      member.renewalDate = renewalDate;
      member.lastPaidAt = payment?.paidAt || "";
      member.lastPaymentAmount = payment ? Number(payment.amount).toFixed(2) : "";
      member.renewalStatus = daysRemaining < 0 ? "Overdue" : daysRemaining <= 30 ? "Due soon" : "Current";
      member.isOverdue = daysRemaining < 0;
      member.isDueSoon = daysRemaining >= 0 && daysRemaining <= 30;
      member.isCurrent = daysRemaining > 30;
      member.daysRemaining = Math.max(0, daysRemaining);
      return member;
    });
    return res.render("renewals", {
      title: "Membership renewals",
      current,
      currentInitials: current.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
      members,
      overdueCount: members.filter((member) => member.isOverdue).length,
      dueSoonCount: members.filter((member) => member.isDueSoon).length,
      currentCount: members.filter((member) => member.isCurrent).length,
      today
    });
  } catch (error) {
    next(error);
  }
};

export const recordMembershipPayment = async (req, res, next) => {
  try {
    const current = await requireManagerPage(req, res);
    if (!current) return;
    if (!/^\d+$/.test(req.params.id)) return res.sendStatus(404);
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.sendStatus(404);
    const rawAmount = typeof req.body.amount === "string" ? req.body.amount.trim() : "";
    const paidAt = typeof req.body.paidAt === "string" ? req.body.paidAt.trim() : "";
    const receiptNumber = typeof req.body.receiptNumber === "string" ? req.body.receiptNumber.trim().slice(0, 80) : "";
    const amount = Number(rawAmount);
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(rawAmount) || !Number.isFinite(amount) || amount <= 0 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(paidAt) || paidAt > TODAY() ||
        new Date(`${paidAt}T00:00:00.000Z`).toISOString().slice(0, 10) !== paidAt) {
      return res.status(400).send("Enter a valid payment amount and payment date.");
    }
    const latestPayment = await MembershipPayment.findOne({
      where: { memberRecordId: member.id },
      order: [["paidAt", "DESC"], ["id", "DESC"]]
    });
    const renewalStart = latestPayment && latestPayment.validUntil > paidAt ? latestPayment.validUntil : paidAt;
    const validUntil = addOneYear(renewalStart);
    await sequelize.transaction(async (transaction) => {
      await MembershipPayment.create({
        memberRecordId: member.id,
        amount: amount.toFixed(2),
        paidAt,
        validUntil,
        receiptNumber: receiptNumber || null,
        recordedBy: current.id
      }, { transaction });
      if (member.status !== "Active") {
        await member.update({ status: "Active" }, { transaction });
        const linkedUser = await User.findOne({ where: { memberId: member.memberId }, transaction });
        if (linkedUser) await linkedUser.update({ status: "Active" }, { transaction });
      }
      await AuditLog.create({
        actorId: current.id,
        actorName: current.name,
        action: "payment_recorded",
        entityType: "membership",
        entityId: String(member.id),
        details: `Recorded a membership renewal payment for ${member.memberId}; valid through ${validUntil}.`
      }, { transaction });
    });
    return res.redirect("/members/renewals");
  } catch (error) {
    next(error);
  }
};

export const exportMembersCsv = async (req, res, next) => {
  try {
    if (!await requireManagerApi(req, res)) return;
    const members = await Member.findAll({
      attributes: PROFILE_FIELDS,
      order: [["lastName", "ASC"], ["firstName", "ASC"]],
      raw: true
    });
    const escapeCell = (value) => {
      let cell = value == null ? "" : String(value);
      if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;
      return `"${cell.replace(/"/g, '""')}"`;
    };
    const columns = ["Member ID", "First name", "Last name", "Address", "Contact number", "Membership date", "Status"];
    const rows = members.map((member) => [
      member.memberId,
      member.firstName,
      member.lastName,
      member.address,
      member.contactNumber || member.contactDetails,
      member.membershipDate,
      member.status
    ]);
    const csv = [columns, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kambac-members-${TODAY()}.csv"`,
      "Cache-Control": "no-store"
    });
    return res.send(`\uFEFF${csv}`);
  } catch (error) {
    next(error);
  }
};

export const membersPdfPage = async (req, res, next) => {
  try {
    const current = await requireManagerPage(req, res);
    if (!current) return;
    const records = await Member.findAll({
      attributes: PROFILE_FIELDS,
      order: [["lastName", "ASC"], ["firstName", "ASC"]]
    });
    return res.render("members-print", {
      title: "Member Directory PDF",
      current,
      members: records.map(presentMember),
      generatedAt: new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date()),
      totalMembers: records.length
    });
  } catch (error) {
    next(error);
  }
};

export const newMemberPage = async (req, res, next) => {
  try {
    const current = await requireManagerPage(req, res);
    if (!current) return;
    return renderForm(res, {
      current,
      isEdit: false,
      member: {
        firstName: "",
        middleName: "",
        lastName: "",
        suffix: "",
        address: "",
        barangay: "",
        municipality: "",
        province: "",
        contactNumber: "",
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
        membershipDate: TODAY(),
        signatureName: "",
        signedAt: TODAY(),
        status: "Active"
      },
      status: 200
    });
  } catch (error) {
    next(error);
  }
};

export const createMember = async (req, res, next) => {
  try {
    const current = await requireManagerPage(req, res);
    if (!current) return;
    const member = normalizeInput(req.body);
    const username = typeof req.body.username === "string" ? req.body.username.trim().toLowerCase() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const errors = validateInput(member);
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) errors.username = "Use 3-32 letters, numbers, dots, dashes, or underscores.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) errors.email = "Enter a valid email address.";
    if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) errors.password = "Use a password of 12-72 UTF-8 bytes.";
    member.username = username;
    member.email = email;
    if (Object.keys(errors).length) return renderForm(res, { member, current, isEdit: false, errors });
    let created;
    try {
      created = await sequelize.transaction(async (transaction) => {
        const duplicate = await User.findOne({
          where: { [Op.or]: [{ username }, { email }] },
          transaction
        });
        if (duplicate) {
          const error = new Error("That username or email address is already associated with an account.");
          error.name = "DuplicateMemberLogin";
          throw error;
        }
        const formData = membershipFormValues(member);
        const record = await Member.create(formData, { transaction });
        await User.create({
          name: formData.name,
          username,
          email,
          password: await bcrypt.hash(password, 12),
          role: "member",
          memberId: record.memberId,
          contactNumber: formData.contactNumber,
          address: formData.address,
          membershipDate: formData.membershipDate,
          status: formData.status === "Active" ? "Active" : formData.status === "Pending" ? "Pending" : "Inactive"
        }, { transaction });
        await AuditLog.create({
          actorId: current.id,
          actorName: current.name,
          action: "created",
          entityType: "member",
          entityId: String(record.id),
          details: `Created member record ${record.memberId}.`
        }, { transaction });
        return record;
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return renderForm(res, {
          member,
          current,
          isEdit: false,
          errors: { form: "The username, email, or member ID is already in use. Review the account details and try again." },
          status: 409
        });
      }
      if (error.name === "DuplicateMemberLogin") {
        return renderForm(res, {
          member,
          current,
          isEdit: false,
          errors: { form: error.message },
          status: 409
        });
      }
      throw error;
    }
    return res.redirect(`/members/${created.id}`);
  } catch (error) {
    next(error);
  }
};

export const editMemberPage = async (req, res, next) => {
  try {
    const current = await requireManagerPage(req, res);
    if (!current) return;
    if (!/^\d+$/.test(req.params.id)) return res.sendStatus(404);
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.sendStatus(404);
    return renderForm(res, { current, member: presentMember(member), isEdit: true, status: 200 });
  } catch (error) {
    next(error);
  }
};

export const updateMember = async (req, res, next) => {
  try {
    const current = await requireManagerPage(req, res);
    if (!current) return;
    if (!/^\d+$/.test(req.params.id)) return res.sendStatus(404);
    const memberRecord = await Member.findByPk(req.params.id);
    if (!memberRecord) return res.sendStatus(404);
    const member = normalizeInput(req.body);
    const errors = validateInput(member, { requireSignature: false });
    if (Object.keys(errors).length) {
      return renderForm(res, {
        member: { ...member, id: memberRecord.id, memberId: memberRecord.memberId },
        current,
        isEdit: true,
        errors
      });
    }
    const formData = membershipFormValues(member);
    await sequelize.transaction(async (transaction) => {
      await memberRecord.update(formData, { transaction });
      const linkedUser = await User.findOne({ where: { memberId: memberRecord.memberId }, transaction });
      if (linkedUser) {
        await linkedUser.update({
          name: formData.name,
          contactNumber: formData.contactNumber,
          address: formData.address,
          membershipDate: formData.membershipDate,
          status: formData.status === "Active" ? "Active" : formData.status === "Pending" ? "Pending" : "Inactive"
        }, { transaction });
      }
      await AuditLog.create({
        actorId: current.id,
        actorName: current.name,
        action: "updated",
        entityType: "member",
        entityId: String(memberRecord.id),
        details: `Updated member record ${memberRecord.memberId}.`
      }, { transaction });
    });
    return res.redirect(`/members/${memberRecord.id}`);
  } catch (error) {
    next(error);
  }
};

export const memberProfilePage = async (req, res, next) => {
  try {
    const current = await requireManagerPage(req, res);
    if (!current) return;
    if (!/^\d+$/.test(req.params.id)) return res.sendStatus(404);
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.sendStatus(404);
    return res.render("member-profile", {
      title: "Member Profile",
      current,
      currentInitials: current.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
      member: presentMember(member),
      canManage: true
    });
  } catch (error) {
    next(error);
  }
};

export const archiveMember = async (req, res, next) => {
  try {
    const current = await requireManagerPage(req, res);
    if (!current) return;
    if (!/^\d+$/.test(req.params.id)) return res.sendStatus(404);
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.sendStatus(404);
    await sequelize.transaction(async (transaction) => {
      await member.destroy({ transaction });
      await AuditLog.create({
        actorId: current.id,
        actorName: current.name,
        action: "archived",
        entityType: "member",
        entityId: String(member.id),
        details: `Archived member record ${member.memberId}.`
      }, { transaction });
    });
    return res.redirect("/members");
  } catch (error) {
    next(error);
  }
};

export const restoreMember = async (req, res, next) => {
  try {
    const current = await requireManagerPage(req, res);
    if (!current) return;
    if (!/^\d+$/.test(req.params.id)) return res.sendStatus(404);
    const member = await Member.findByPk(req.params.id, { paranoid: false });
    if (!member || !member.archivedAt) return res.sendStatus(404);
    await sequelize.transaction(async (transaction) => {
      await member.restore({ transaction });
      await AuditLog.create({
        actorId: current.id,
        actorName: current.name,
        action: "restored",
        entityType: "member",
        entityId: String(member.id),
        details: `Restored member record ${member.memberId}.`
      }, { transaction });
    });
    return res.redirect("/members/archive");
  } catch (error) {
    next(error);
  }
};

export const listMembersApi = async (req, res, next) => {
  try {
    if (!await requireManagerApi(req, res)) return;
    const options = parseListOptions(req.query);
    return res.json(await listRecords(options));
  } catch (error) {
    next(error);
  }
};

export const getMemberApi = async (req, res, next) => {
  try {
    if (!await requireManagerApi(req, res)) return;
    if (!validMemberId(req.params.memberId)) return res.status(404).json({ error: "Member not found." });
    const member = await Member.findOne({ where: { memberId: req.params.memberId } });
    if (!member) return res.status(404).json({ error: "Member not found." });
    return res.json({ member: presentMember(member) });
  } catch (error) {
    next(error);
  }
};

export const createMemberApi = async (req, res, next) => {
  try {
    const current = await requireManagerApi(req, res);
    if (!current) return;
    const member = normalizeInput(req.body);
    const errors = validateInput(member);
    const username = typeof req.body.username === "string" ? req.body.username.trim().toLowerCase() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) errors.username = "Enter a valid username.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) errors.email = "Enter a valid email address.";
    if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) errors.password = "Use a password of 12-72 UTF-8 bytes.";
    if (Object.keys(errors).length) return res.status(400).json({ error: "Member details are invalid.", fields: errors });
    let created;
    try {
      created = await sequelize.transaction(async (transaction) => {
        const duplicate = await User.findOne({
          where: { [Op.or]: [{ username }, { email }] },
          transaction
        });
        if (duplicate) return null;
        const formData = membershipFormValues(member);
        const record = await Member.create(formData, { transaction });
        await User.create({
          name: formData.name,
          username,
          email,
          password: await bcrypt.hash(password, 12),
          role: "member",
          memberId: record.memberId,
          contactNumber: formData.contactNumber,
          address: formData.address,
          membershipDate: formData.membershipDate,
          status: formData.status === "Active" ? "Active" : formData.status === "Pending" ? "Pending" : "Inactive"
        }, { transaction });
        await AuditLog.create({
          actorId: current.id,
          actorName: current.name,
          action: "created",
          entityType: "member",
          entityId: String(record.id),
          details: `Created member record ${record.memberId}.`
        }, { transaction });
        return record;
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return res.status(409).json({ error: "A unique member ID could not be generated. Please try again." });
      }
      throw error;
    }
    if (!created) return res.status(409).json({ error: "That username or email address is already associated with an account." });
    return res.status(201).json({ member: presentMember(created) });
  } catch (error) {
    next(error);
  }
};

export const updateMemberApi = async (req, res, next) => {
  try {
    const current = await requireManagerApi(req, res);
    if (!current) return;
    if (!validMemberId(req.params.memberId)) return res.status(404).json({ error: "Member not found." });
    const memberRecord = await Member.findOne({ where: { memberId: req.params.memberId } });
    if (!memberRecord) return res.status(404).json({ error: "Member not found." });
    const member = normalizeInput({ ...memberRecord.get({ plain: true }), ...req.body });
    const errors = validateInput(member, { requireSignature: false });
    if (Object.keys(errors).length) return res.status(400).json({ error: "Member details are invalid.", fields: errors });
    const formData = membershipFormValues(member);
    await sequelize.transaction(async (transaction) => {
      await memberRecord.update(formData, { transaction });
      const linkedUser = await User.findOne({ where: { memberId: memberRecord.memberId }, transaction });
      if (linkedUser) {
        await linkedUser.update({
          name: formData.name,
          contactNumber: formData.contactNumber,
          address: formData.address,
          membershipDate: formData.membershipDate,
          status: formData.status === "Active" ? "Active" : formData.status === "Pending" ? "Pending" : "Inactive"
        }, { transaction });
      }
      await AuditLog.create({
        actorId: current.id,
        actorName: current.name,
        action: "updated",
        entityType: "member",
        entityId: String(memberRecord.id),
        details: `Updated member record ${memberRecord.memberId}.`
      }, { transaction });
    });
    return res.json({ member: presentMember(memberRecord) });
  } catch (error) {
    next(error);
  }
};

export const updateMemberApiById = async (req, res, next) => {
  try {
    const current = await requireManagerApi(req, res);
    if (!current) return;
    if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: "Member not found." });
    const memberRecord = await Member.findByPk(req.params.id);
    if (!memberRecord) return res.status(404).json({ error: "Member not found." });
    const member = normalizeInput({ ...memberRecord.get({ plain: true }), ...req.body });
    const errors = validateInput(member, { requireSignature: false });
    if (Object.keys(errors).length) return res.status(400).json({ error: "Member details are invalid.", fields: errors });
    const formData = membershipFormValues(member);
    await sequelize.transaction(async (transaction) => {
      await memberRecord.update(formData, { transaction });
      const linkedUser = await User.findOne({ where: { memberId: memberRecord.memberId }, transaction });
      if (linkedUser) {
        await linkedUser.update({
          name: formData.name,
          contactNumber: formData.contactNumber,
          address: formData.address,
          membershipDate: formData.membershipDate,
          status: formData.status === "Active" ? "Active" : formData.status === "Pending" ? "Pending" : "Inactive"
        }, { transaction });
      }
      await AuditLog.create({
        actorId: current.id,
        actorName: current.name,
        action: "updated",
        entityType: "member",
        entityId: String(memberRecord.id),
        details: `Updated member record ${memberRecord.memberId}.`
      }, { transaction });
    });
    return res.json({ member: presentMember(memberRecord) });
  } catch (error) {
    next(error);
  }
};

export const archiveMemberApi = async (req, res, next) => {
  try {
    const current = await requireManagerApi(req, res);
    if (!current) return;
    if (!validMemberId(req.params.memberId)) return res.status(404).json({ error: "Member not found." });
    const member = await Member.findOne({ where: { memberId: req.params.memberId } });
    if (!member) return res.status(404).json({ error: "Member not found." });
    await member.destroy();
    await AuditLog.create({
      actorId: current.id,
      actorName: current.name,
      action: "archived",
      entityType: "member",
      entityId: String(member.id),
      details: `Archived member record ${member.memberId}.`
    });
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const restoreMemberApi = async (req, res, next) => {
  try {
    const current = await requireManagerApi(req, res);
    if (!current) return;
    if (!validMemberId(req.params.memberId)) return res.status(404).json({ error: "Member not found." });
    const member = await Member.findOne({ where: { memberId: req.params.memberId }, paranoid: false });
    if (!member || !member.archivedAt) return res.status(404).json({ error: "Archived member not found." });
    await member.restore();
    await AuditLog.create({
      actorId: current.id,
      actorName: current.name,
      action: "restored",
      entityType: "member",
      entityId: String(member.id),
      details: `Restored member record ${member.memberId}.`
    });
    return res.json({ member: presentMember(member) });
  } catch (error) {
    next(error);
  }
};
