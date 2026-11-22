import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Op } from "sequelize";
import { BORROWABLE_CONDITIONS, EQUIPMENT_CONDITIONS, ensureEquipmentSchema, Equipment, sequelize } from "../models/equipmentModel.js";
import { Borrowing } from "../models/borrowingModel.js";

await ensureEquipmentSchema();
await Borrowing.sync();

const PAGE_SIZE = 15;
const SORT_FIELDS = new Set(["name", "category", "totalQuantity", "availableQuantity", "createdAt", "updatedAt"]);
const AGRICULTURAL_CATEGORIES = [
  "Mga Kagamitan sa Pagbungkal",
  "Mga Gamit sa Pag-ani at Pagputol",
  "Makinarya at Motorized Equipment",
  "Patubig at Pagdidilig",
  "Iba pang Kasangkapan sa Bukid"
];
const conditionLabels = {
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  damaged: "Damaged",
  under_repair: "Under repair"
};
const photoExtension = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return ".jpg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return ".png";
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))) return ".gif";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return ".webp";
  return null;
};
const saveEquipmentPhoto = async (file) => {
  if (!file) return null;
  const extension = photoExtension(file.buffer);
  if (!extension) {
    const error = new Error("The uploaded file is not a valid JPEG, PNG, or GIF image.");
    error.name = "InvalidEquipmentPhotoError";
    throw error;
  }

  const directory = path.join(process.cwd(), "public", "uploads", "equipment");
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}${extension}`;
  const absolutePath = path.join(directory, filename);
  await writeFile(absolutePath, file.buffer, { flag: "wx" });
  return { absolutePath, publicPath: `/uploads/equipment/${filename}` };
};
const removeSavedPhoto = async (photo) => {
  if (photo) await rm(photo.absolutePath, { force: true });
};

const textValue = (value) => typeof value === "string" ? value.trim() : "";
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const today = () => new Date().toISOString().slice(0, 10);
const isDateOnly = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const equipmentStatus = (item) => {
  if (!item.isActive) return "Archived";
  if (!BORROWABLE_CONDITIONS.includes(item.condition)) return "Unavailable";
  if (item.availableQuantity === 0) return "Unavailable";
  return "Available";
};

const validateForm = (body) => {
  const form = {
    name: textValue(body.name),
    category: textValue(body.category),
    totalQuantity: textValue(body.totalQuantity),
    description: textValue(body.description)
  };
  const errors = [];

  if (!form.name || form.name.length > 120) errors.push("Equipment name is required and must be at most 120 characters.");
  if (!form.category || form.category.length > 80) errors.push("Category is required and must be at most 80 characters.");
  if (!/^\d+$/.test(form.totalQuantity) || !Number.isSafeInteger(Number(form.totalQuantity)) || Number(form.totalQuantity) > 2147483647) {
    errors.push("Total quantity must be a whole number between 0 and 2,147,483,647.");
  }

  return { form, errors };
};

const formOptions = () => EQUIPMENT_CONDITIONS.map((value) => ({
  value,
  label: conditionLabels[value]
}));

const parseId = (value) => /^\d+$/.test(value) ? Number(value) : null;

const findEquipment = async (id) => {
  const numericId = parseId(id);
  if (!numericId) return null;
  return Equipment.findByPk(numericId);
};

const formData = (item, form, errors, editing) => ({
  title: editing ? "Edit equipment" : "Add equipment",
  editing,
  itemId: item?.id,
  form: form || {
    name: item?.name || "",
    category: item?.category || "",
    totalQuantity: item?.totalQuantity ?? 0,
  },
  dateAdded: item?.createdAt ? item.createdAt.toISOString().slice(0, 10) : today(),
  categories: [
    ...(item?.category && !AGRICULTURAL_CATEGORIES.includes(item.category)
      ? [{
        value: item.category,
        label: item.category,
        selected: (form?.category || item.category) === item.category
      }]
      : []),
    ...AGRICULTURAL_CATEGORIES.map((category) => ({
      value: category,
      label: category,
      selected: category === (form?.category || item?.category)
    }))
  ],
  errors: errors || [],
  borrowedQuantity: item?.borrowedQuantity || 0,
  photoPath: item?.photoPath || "",
  backUrl: "/equipment"
});

export const listEquipment = asyncHandler(async (req, res) => {
  const search = textValue(req.query.search).slice(0, 100);
  const category = textValue(req.query.category).slice(0, 80);
  const availability = ["available", "borrowed", "unavailable", "archived"].includes(req.query.availability)
    ? req.query.availability
    : "";
  const requestedSort = textValue(req.query.sort);
  const sort = SORT_FIELDS.has(requestedSort) ? requestedSort : "createdAt";
  const direction = req.query.direction === "asc" ? "ASC" : "DESC";
  const requestedPage = Number.parseInt(req.query.page, 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const conditions = [];
  if (search) {
    conditions.push({ name: { [Op.like]: `%${search}%` } });
  }
  if (category) conditions.push({ category });
  if (availability === "available") {
    conditions.push({ isActive: true });
    conditions.push({ condition: { [Op.in]: BORROWABLE_CONDITIONS } });
    conditions.push({ availableQuantity: { [Op.gt]: 0 } });
  } else if (availability === "borrowed") {
    conditions.push({ isActive: true });
    conditions.push({ borrowedQuantity: { [Op.gt]: 0 } });
  } else if (availability === "unavailable") {
    conditions.push({ isActive: true });
    conditions.push({ [Op.or]: [
      { condition: { [Op.notIn]: BORROWABLE_CONDITIONS } },
      { availableQuantity: 0 }
    ] });
  } else if (availability === "archived") {
    conditions.push({ isActive: false });
  } else {
    conditions.push({ isActive: true });
  }
  const where = { [Op.and]: conditions };

  const [result, categories, totalItems, availableItems, borrowedItems, archivedItems, borrowingRecords, borrowingEquipment, borrowableEquipment] = await Promise.all([
    Equipment.findAndCountAll({
      where,
      order: [[sort, direction], ["id", "ASC"]],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE
    }),
    Equipment.findAll({ attributes: ["category"], group: ["category"], order: [["category", "ASC"]], raw: true }),
    Equipment.count({ where: { isActive: true } }),
    Equipment.sum("availableQuantity", { where: { isActive: true, condition: { [Op.in]: BORROWABLE_CONDITIONS } } }),
    Equipment.sum("borrowedQuantity", { where: { isActive: true } }),
    Equipment.count({ where: { isActive: false } }),
    Borrowing.findAll({ order: [["borrowedAt", "DESC"], ["id", "DESC"]] }),
    Equipment.findAll({ attributes: ["id", "name"] }),
    Equipment.findAll({
      attributes: ["id", "name", "availableQuantity"],
      where: {
        isActive: true,
        condition: { [Op.in]: BORROWABLE_CONDITIONS },
        availableQuantity: { [Op.gt]: 0 }
      },
      order: [["name", "ASC"]]
    })
  ]);

  const borrowingEquipmentNames = new Map(borrowingEquipment.map((item) => [item.id, item.name]));
  const borrowingRows = borrowingRecords.map((record) => {
    const plain = record.get({ plain: true });
    const isReturned = Boolean(plain.returnedAt);
    const isOverdue = !isReturned && plain.dueDate < today();
    return {
      ...plain,
      equipmentName: borrowingEquipmentNames.get(plain.equipmentId) || "Unknown equipment",
      borrowedDate: plain.borrowedAt,
      isReturned,
      statusLabel: isReturned ? "Returned" : isOverdue ? "Overdue" : "Borrowed",
      statusClass: isReturned ? "borrowing-status-returned" : isOverdue ? "borrowing-status-overdue" : "borrowing-status-borrowed"
    };
  });

  const query = new URLSearchParams();
  if (search) query.set("search", search);
  if (category) query.set("category", category);
  if (availability) query.set("availability", availability);
  query.set("sort", sort);
  query.set("direction", direction);

  const pageUrl = (targetPage) => {
    const params = new URLSearchParams(query);
    params.set("page", String(targetPage));
    return `/equipment?${params.toString()}`;
  };
  const totalPages = Math.ceil(result.count / PAGE_SIZE);
  if (totalPages > 0 && page > totalPages) return res.redirect(pageUrl(totalPages));
  const hasInventoryRecords = totalItems + archivedItems > 0;

  res.render("equipment", {
    title: "Equipment inventory",
    equipmentPage: true,
    archivedPage: availability === "archived",
    addEquipmentCategories: [...new Set([
      ...AGRICULTURAL_CATEGORIES,
      ...categories.map((row) => row.category)
    ])].map((value) => ({ value, label: value })),
    todayDate: today(),
    borrowings: borrowingRows,
    borrowableItems: borrowableEquipment.map((item) => item.get({ plain: true })),
    items: result.rows.map((item) => ({
      ...item.get({ plain: true }),
      statusLabel: equipmentStatus(item),
      conditionLabel: conditionLabels[item.condition],
      createdDate: item.createdAt.toLocaleDateString()
    })),
    categories: categories.map((row) => ({ value: row.category, selected: row.category === category })),
    filters: {
      search,
      category,
      availability,
      sort,
      direction,
      isAvailable: availability === "available",
      isBorrowed: availability === "borrowed",
      isUnavailable: availability === "unavailable",
      isArchived: availability === "archived",
      sortCreated: sort === "createdAt",
      sortUpdated: sort === "updatedAt",
      sortName: sort === "name",
      sortCategory: sort === "category",
      sortTotal: sort === "totalQuantity",
      sortAvailable: sort === "availableQuantity",
      ascending: direction === "asc",
      descending: direction === "desc"
    },
    emptyTitle: result.count
      ? "No matching equipment"
      : availability === "archived" && archivedItems === 0
        ? "No archived equipment"
        : hasInventoryRecords
          ? "No matching equipment"
          : "No equipment registered",
    emptyMessage: result.count
      ? "No items match the selected search and filters."
      : availability === "archived"
        ? "Archived items will appear here."
        : hasInventoryRecords
          ? "No items match the selected search and filters."
          : "Add equipment to start building the inventory.",
    emptyIsUnfiltered: !hasInventoryRecords && !search && !category && !availability,
    counts: {
      total: totalItems,
      available: availableItems || 0,
      borrowed: borrowedItems || 0,
      archived: archivedItems
    },
    pagination: {
      page,
      totalPages,
      total: result.count,
      start: result.count ? ((page - 1) * PAGE_SIZE) + 1 : 0,
      end: Math.min(page * PAGE_SIZE, result.count),
      previousUrl: page > 1 ? pageUrl(page - 1) : null,
      nextUrl: page < totalPages ? pageUrl(page + 1) : null
    }
  });
});

export const newEquipmentPage = (req, res) => {
  res.render("equipment-form", formData(null, null, [], false));
};

export const createEquipment = asyncHandler(async (req, res) => {
  const { form, errors } = validateForm(req.body);
  if (errors.length) {
    errors.forEach((message) => req.flash("error_msg", message));
    return res.redirect("/equipment");
  }

  let photo;
  try {
    photo = await saveEquipmentPhoto(req.file);
    await Equipment.create({
      itemCode: `EQ-${randomUUID()}`,
      name: form.name,
      category: form.category,
      description: form.description || null,
      photoPath: photo?.publicPath || null,
      totalQuantity: Number(form.totalQuantity),
      availableQuantity: Number(form.totalQuantity),
      borrowedQuantity: 0,
      condition: "good"
    });
  } catch (error) {
    await removeSavedPhoto(photo);
    if (error.name === "InvalidEquipmentPhotoError") {
      req.flash("error_msg", error.message);
      return res.redirect("/equipment");
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      req.flash("error_msg", "Could not assign a unique equipment record. Please try again.");
      return res.redirect("/equipment");
    }
    if (error.name === "SequelizeValidationError") {
      error.errors.forEach((entry) => req.flash("error_msg", entry.message));
      return res.redirect("/equipment");
    }
    throw error;
  }

  req.flash("success_msg", "Equipment item added.");
  res.redirect("/equipment");
});

export const showEquipment = asyncHandler(async (req, res) => {
  const item = await findEquipment(req.params.id);
  if (!item) return res.status(404).render("not-found", { title: "Equipment not found", message: "That equipment item does not exist.", equipmentPage: true });

  res.render("equipment-detail", {
    title: item.name,
    equipmentPage: true,
    item: {
      ...item.get({ plain: true }),
      statusLabel: equipmentStatus(item),
      conditionLabel: conditionLabels[item.condition],
      createdDate: item.createdAt.toLocaleString(),
      updatedDate: item.updatedAt.toLocaleString()
    }
  });
});

export const borrowEquipment = asyncHandler(async (req, res) => {
  const equipmentId = parseId(req.params.id);
  if (!equipmentId) return res.status(404).render("not-found", { title: "Equipment not found", message: "That equipment item does not exist.", equipmentPage: true });
  const redirectUrl = req.body.returnTo === "inventory" ? "/equipment" : `/equipment/${equipmentId}`;

  const borrowerName = textValue(req.body.borrowerName);
  const quantityValue = textValue(req.body.quantity);
  const dueDate = textValue(req.body.dueDate);
  const purpose = textValue(req.body.purpose);
  const quantity = Number(quantityValue);
  const errors = [];

  if (!borrowerName || borrowerName.length > 120) errors.push("Borrower name is required and must be at most 120 characters.");
  if (!/^\d+$/.test(quantityValue) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 2147483647) {
    errors.push("Quantity must be a whole number between 1 and 2,147,483,647.");
  }
  if (!isDateOnly(dueDate) || dueDate < today()) errors.push("Expected return date must be today or a later date.");
  if (purpose.length > 2000) errors.push("Purpose or notes must be at most 2,000 characters.");

  if (errors.length) {
    for (const error of errors) req.flash("error_msg", error);
    return res.redirect(redirectUrl);
  }

  try {
    await sequelize.transaction(async (transaction) => {
      const item = await Equipment.findByPk(equipmentId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!item) {
        const error = new Error("Equipment not found.");
        error.name = "EquipmentNotFoundError";
        throw error;
      }
      if (!item.isActive || !BORROWABLE_CONDITIONS.includes(item.condition)) {
        const error = new Error("This equipment is not currently available for borrowing.");
        error.name = "EquipmentUnavailableError";
        throw error;
      }
      if (quantity > item.availableQuantity) {
        const error = new Error(`Only ${item.availableQuantity} unit(s) available to borrow.`);
        error.name = "InsufficientEquipmentError";
        throw error;
      }

      await item.update({
        availableQuantity: item.availableQuantity - quantity,
        borrowedQuantity: item.borrowedQuantity + quantity
      }, { transaction });
      await Borrowing.create({
        equipmentId,
        borrowerName,
        quantity,
        borrowedAt: today(),
        dueDate,
        purpose: purpose || null
      }, { transaction });
    });
  } catch (error) {
    if (error.name === "EquipmentNotFoundError") {
      return res.status(404).render("not-found", { title: "Equipment not found", message: "That equipment item does not exist.", equipmentPage: true });
    }
    if (["EquipmentUnavailableError", "InsufficientEquipmentError"].includes(error.name)) {
      req.flash("error_msg", error.message);
      return res.redirect(redirectUrl);
    }
    throw error;
  }

  req.flash("success_msg", "Equipment borrowing recorded.");
  res.redirect(redirectUrl);
});

export const returnBorrowedEquipment = asyncHandler(async (req, res) => {
  const equipmentId = parseId(req.params.id);
  const borrowingId = parseId(req.params.borrowingId);
  const redirectUrl = `/equipment/${equipmentId}`;
  if (!equipmentId || !borrowingId) return res.status(404).render("not-found", { title: "Borrowing record not found", message: "That borrowing record does not exist.", equipmentPage: true });

  try {
    await sequelize.transaction(async (transaction) => {
      const item = await Equipment.findByPk(equipmentId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!item) {
        const error = new Error("Equipment not found.");
        error.name = "EquipmentNotFoundError";
        throw error;
      }

      const borrowing = await Borrowing.findOne({
        where: { id: borrowingId, equipmentId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!borrowing) {
        const error = new Error("Borrowing record not found.");
        error.name = "BorrowingNotFoundError";
        throw error;
      }
      if (borrowing.returnedAt) {
        const error = new Error("This borrowing record has already been returned.");
        error.name = "AlreadyReturnedError";
        throw error;
      }
      if (borrowing.quantity > item.borrowedQuantity) {
        throw new Error("Borrowed quantity is inconsistent with this record; return was not recorded.");
      }

      await item.update({
        availableQuantity: item.availableQuantity + borrowing.quantity,
        borrowedQuantity: item.borrowedQuantity - borrowing.quantity
      }, { transaction });
      await borrowing.update({ returnedAt: today() }, { transaction });
    });
  } catch (error) {
    if (["EquipmentNotFoundError", "BorrowingNotFoundError"].includes(error.name)) {
      return res.status(404).render("not-found", { title: "Borrowing record not found", message: "That borrowing record does not exist.", equipmentPage: true });
    }
    if (error.name === "AlreadyReturnedError") {
      req.flash("error_msg", error.message);
      return res.redirect(redirectUrl);
    }
    throw error;
  }

  req.flash("success_msg", "Equipment return recorded.");
  res.redirect(redirectUrl);
});

export const editEquipmentPage = asyncHandler(async (req, res) => {
  const item = await findEquipment(req.params.id);
  if (!item) return res.status(404).render("not-found", { title: "Equipment not found", message: "That equipment item does not exist.", equipmentPage: true });
  res.render("equipment-form", formData(item, null, [], true));
});

export const updateEquipment = asyncHandler(async (req, res) => {
  const numericId = parseId(req.params.id);
  if (!numericId) return res.status(404).render("not-found", { title: "Equipment not found", message: "That equipment item does not exist.", equipmentPage: true });
  const returnToInventory = req.body.returnTo === "inventory";

  let item;
  let photo;
  let form;
  let errors = [];
  try {
    photo = await saveEquipmentPhoto(req.file);
    await sequelize.transaction(async (transaction) => {
      item = await Equipment.findByPk(numericId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!item) return;

      ({ form, errors } = validateForm(req.body));
      const validationErrors = [...errors];
      if (Number.isSafeInteger(Number(form.totalQuantity)) && Number(form.totalQuantity) < item.borrowedQuantity) {
        validationErrors.push(`Total quantity cannot be less than the ${item.borrowedQuantity} item(s) currently borrowed.`);
      }
      if (validationErrors.length) {
        const error = new Error("Invalid equipment form.");
        error.name = "EquipmentFormError";
        error.validationErrors = validationErrors;
        throw error;
      }

      const totalQuantity = Number(form.totalQuantity);
      await item.update({
        name: form.name,
        category: form.category,
        ...(Object.prototype.hasOwnProperty.call(req.body, "description")
          ? { description: form.description || null }
          : {}),
        totalQuantity,
        availableQuantity: totalQuantity - item.borrowedQuantity,
        ...(photo ? { photoPath: photo.publicPath } : {})
      }, { transaction });
    });
  } catch (error) {
    await removeSavedPhoto(photo);
    if (error.name === "InvalidEquipmentPhotoError") {
      if (returnToInventory) {
        req.flash("error_msg", error.message);
        return res.redirect("/equipment");
      }
      item = await findEquipment(req.params.id);
      return res.status(400).render("equipment-form", formData(item, form, [...errors, error.message], true));
    }
    if (error.name === "EquipmentFormError") {
      if (returnToInventory) {
        error.validationErrors.forEach((message) => req.flash("error_msg", message));
        return res.redirect("/equipment");
      }
      item = await findEquipment(req.params.id);
      return res.status(400).render("equipment-form", formData(item, form, error.validationErrors, true));
    }
    if (error.name === "SequelizeValidationError") {
      if (returnToInventory) {
        error.errors.forEach((entry) => req.flash("error_msg", entry.message));
        return res.redirect("/equipment");
      }
      item = await findEquipment(req.params.id);
      return res.status(400).render("equipment-form", formData(item, form, error.errors.map((entry) => entry.message), true));
    }
    throw error;
  }

  if (!item) {
    await removeSavedPhoto(photo);
    return res.status(404).render("not-found", { title: "Equipment not found", message: "That equipment item does not exist.", equipmentPage: true });
  }
  req.flash("success_msg", "Equipment details updated.");
  res.redirect(returnToInventory ? "/equipment" : `/equipment/${numericId}`);
});

export const toggleEquipmentActive = asyncHandler(async (req, res) => {
  const numericId = parseId(req.params.id);
  if (!numericId) return res.status(404).render("not-found", { title: "Equipment not found", message: "That equipment item does not exist.", equipmentPage: true });
  if (req.body.action !== "archive" && req.body.action !== "activate") {
    return res.status(400).send("Invalid equipment status action.");
  }

  const item = await Equipment.findByPk(numericId);
  if (!item) return res.status(404).render("not-found", { title: "Equipment not found", message: "That equipment item does not exist.", equipmentPage: true });

  const isActive = req.body.action === "activate";
  await item.update({ isActive });
  req.flash("success_msg", isActive ? "Equipment item activated." : "Equipment item archived.");
  res.redirect(`/equipment/${numericId}`);
});

export const equipmentFormData = formData;
