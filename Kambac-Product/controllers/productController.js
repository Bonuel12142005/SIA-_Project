import { Op } from "sequelize";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { sequelize } from "../models/db.js";
import { Product } from "../models/productModel.js";
import { User } from "../models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDirectory = path.join(__dirname, "../public/uploads/products");

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
    callback(null, uploadDirectory);
  },
  filename(req, file, callback) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `product-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  }
});

export const uploadProductImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    const allowedTypes = /\.(jpeg|jpg|png|gif|webp)$/i;
    if (allowedTypes.test(file.originalname) && /^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error("Only JPEG, PNG, GIF, and WEBP image files are allowed."));
    }
  }
}).single("productImage");

const defaultCategories = ["Feeds", "Supplies", "Equipment", "Other"];

const requireUser = (req, res) => {
  if (!req.session.userId) {
    res.redirect("/login");
    return false;
  }
  return true;
};

const canManage = async (req, res) => {
  if (!requireUser(req, res)) return false;
  req.user = await User.findByPk(req.session.userId);
  if (!req.user || !["admin", "staff"].includes(req.user.role)) {
    req.flash("error_msg", "You do not have permission to manage products.");
    res.redirect("/products");
    return false;
  }
  return true;
};

const canAddProduct = async (req, res) => {
  if (!requireUser(req, res)) return false;
  req.user = await User.findByPk(req.session.userId);
  if (!req.user) { res.redirect('/login'); return false; }
  return true;
};

const stockStatus = (quantity) => {
  if (quantity === 0) return "out_of_stock";
  if (quantity <= 10) return "low_stock";
  return "available";
};

const getProductSummary = async () => {
  const [total, available, lowStock, outOfStock, valueRow] = await Promise.all([
    Product.count(),
    Product.count({ where: { quantity: { [Op.gt]: 10 } } }),
    Product.count({ where: { quantity: { [Op.between]: [1, 10] } } }),
    Product.count({ where: { quantity: 0 } }),
    Product.findOne({ attributes: [[sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.literal("quantity * price")), 0), "totalValue"]], raw: true })
  ]);
  return { total, available, lowStock, outOfStock, totalValue: Number(valueRow?.totalValue || 0).toFixed(2) };
};

const getCategories = async () => {
  const rows = await Product.findAll({
    attributes: [[sequelize.fn("DISTINCT", sequelize.col("category")), "category"]],
    order: [["category", "ASC"]],
    raw: true
  });
  const categories = rows.map((row) => row.category).filter(Boolean);
  return [...new Set([...defaultCategories, ...categories])];
};

const getCategoryOptions = (categories, selectedCategory = "") =>
  categories.map((category) => ({ name: category, selected: category === selectedCategory }));

const decorateProduct = (product) => {
  const value = product.toJSON ? product.toJSON() : product;
  const currentStockStatus = stockStatus(Number(value.quantity));
  return {
    ...value,
    stockStatus: currentStockStatus,
    stockLabel: currentStockStatus.replace("_", " "),
    statusClass: value.status === "inactive" ? "inactive" : "available"
  };
};

const decorateFormProduct = (product = {}) => ({
  ...product,
  statusInactive: product.status === "inactive"
});

const renderError = (res, status, message, data = {}) => {
  res.status(status).render("products", {
    title: "Products",
    categories: getCategoryOptions(data.categories || defaultCategories),
    products: [],
    summary: data.summary || { total: 0, available: 0, lowStock: 0, outOfStock: 0 },
    formProduct: decorateFormProduct(data.formProduct || {}),
    formMode: data.formMode || "create",
    isEdit: data.formMode === "edit",
    canAdd: Boolean(data.canAdd || data.canManage),
    showForm: Boolean(data.canAdd || data.canManage),
    pageError: message,
    ...data
  });
};

const parseProduct = (body) => {
  const product = {
    productCode: String(body.productCode || `PRD-${Date.now()}`).trim(),
    productName: String(body.productName || "").trim(),
    category: String(body.category || "Other").trim(),
    description: String(body.description || "").trim(),
    quantity: body.quantity === "" ? NaN : Number(body.quantity),
    unit: String(body.unit || "").trim(),
    price: body.price === "" ? NaN : Number(body.price),
    status: body.status === "inactive" ? "inactive" : "active"
  };
  const errors = [];
  if (!product.productName || !product.category || !product.unit) {
    errors.push("Product code, name, category, and unit are required.");
  }
  if (!Number.isInteger(product.quantity) || product.quantity < 0) {
    errors.push("Quantity must be a whole number of 0 or more.");
  }
  if (!Number.isFinite(product.price) || product.price < 0) {
    errors.push("Price must be a number of 0 or more.");
  }
  return { product, errors };
};

export const productPage = async (req, res) => {
  if (!requireUser(req, res)) return;
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user) return res.redirect("/login");
    req.user = user;
    const { search = "", category = "", availability = "", stock = "" } = req.query;
    const where = {};
    const [summary, categories] = await Promise.all([getProductSummary(), getCategories()]);
    if (search.trim()) {
      where[Op.or] = [
        { productCode: { [Op.like]: `%${search.trim()}%` } },
        { productName: { [Op.like]: `%${search.trim()}%` } },
        { category: { [Op.like]: `%${search.trim()}%` } },
        { description: { [Op.like]: `%${search.trim()}%` } }
      ];
    }
    if (category) where.category = category;
    if (availability) where.status = availability;
    let products = (await Product.findAll({ where, order: [["productName", "ASC"]] })).map(decorateProduct);
    if (stock) products = products.filter((product) => product.stockStatus === stock);
    res.render("products", {
      title: "Products",
      user: user.toJSON(),
      userInitial: user.name.charAt(0).toUpperCase(),
      products,
      summary,
      categories: getCategoryOptions(categories, category),
      search,
      selectedCategory: category,
      selectedAvailability: availability,
      selectedStock: stock,
      isActiveAvailability: availability === "active",
      isInactiveAvailability: availability === "inactive",
      isAvailableStock: stock === "available",
      isLowStock: stock === "low_stock",
      isOutOfStock: stock === "out_of_stock",
      showForm: Boolean(req.showProductForm),
      canAdd: true,
      canManage: ["admin", "staff"].includes(user.role),
      formProduct: {},
      formMode: "create"
    });
  } catch (error) {
    renderError(res, 500, "Unable to load products. Please try again.");
  }
};

export const newProductPage = async (req, res) => {
  if (!(await canAddProduct(req, res))) return;
  req.showProductForm = true;
  return productPage(req, res);
};

export const viewProduct = async (req, res) => {
  if (!requireUser(req, res)) return;
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user) return res.redirect("/login");
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).render("products", { title: "Product Not Found", products: [], categories: defaultCategories, pageError: "Product not found.", formProduct: {}, formMode: "create" });
    res.render("product-details", { title: product.productName, product: decorateProduct(product), canManage: ["admin", "staff"].includes(user.role) });
  } catch (error) {
    renderError(res, 500, "Unable to load product details.");
  }
};

export const createProduct = async (req, res) => {
  if (!(await canAddProduct(req, res))) return;
  const { product, errors } = parseProduct(req.body);
  if (req.file) product.imagePath = `/uploads/products/${req.file.filename}`;
  if (errors.length) {
    if (req.file) fs.unlinkSync(req.file.path);
    if (req.accepts(["json", "html"]) === "json") return res.status(400).json({ success: false, message: errors.join(" ") });
    return renderError(res, 400, errors.join(" "), { formProduct: product, formMode: "create", canAdd: true, canManage: ["admin", "staff"].includes(req.user.role) });
  }
  try {
    await Product.create(product);
    if (req.accepts(["json", "html"]) === "json") return res.json({ success: true, message: "Product added successfully" });
    req.flash("success_msg", "Product added successfully.");
    res.redirect("/products");
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    const message = error.name === "SequelizeUniqueConstraintError" ? "Product code already exists." : "Unable to add product.";
    if (req.accepts(["json", "html"]) === "json") return res.status(400).json({ success: false, message });
    renderError(res, 400, message, { formProduct: product, formMode: "create", canAdd: true, canManage: ["admin", "staff"].includes(req.user.role) });
  }
};

export const getProductJson = async (req, res) => {
  if (!requireUser(req, res)) return;
  if (req.accepts(["html", "json"]) === "html") return viewProduct(req, res);
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product: decorateProduct(product) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to load product details" });
  }
};

export const editProductPage = async (req, res) => {
  if (!(await canManage(req, res))) return;
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).send("Product not found");
    const [summary, categories] = await Promise.all([getProductSummary(), getCategories()]);
    res.render("products", { title: "Edit Product", products: [], summary, categories: getCategoryOptions(categories, product.category), formProduct: decorateFormProduct(product.toJSON()), formMode: "edit", isEdit: true, showForm: true, canAdd: true, canManage: true });
  } catch (error) {
    renderError(res, 500, "Unable to load product for editing.");
  }
};

export const updateProduct = async (req, res) => {
  if (!(await canManage(req, res))) return;
  const existing = await Product.findByPk(req.params.id);
  if (!existing) {
    if (req.file) fs.unlinkSync(req.file.path);
    if (req.get("accept")?.includes("application/json")) return res.status(404).json({ success: false, message: "Product not found" });
    return res.status(404).send("Product not found");
  }
  const updateBody = {
    ...req.body,
    productCode: req.body.productCode || existing.productCode,
    category: req.body.category || existing.category,
    unit: req.body.unit || existing.unit
  };
  const { product, errors } = parseProduct(updateBody);
  if (errors.length) {
    if (req.file) fs.unlinkSync(req.file.path);
    if (req.get("accept")?.includes("application/json")) return res.status(400).json({ success: false, message: errors.join(" ") });
    return renderError(res, 400, errors.join(" "), { formProduct: { ...product, id: req.params.id }, formMode: "edit", canManage: true });
  }
  try {
    if (!existing) {
      if (req.file) fs.unlinkSync(req.file.path);
      if (req.get("accept")?.includes("application/json")) return res.status(404).json({ success: false, message: "Product not found" });
      return res.status(404).send("Product not found");
    }
    const previousImage = existing.imagePath;
    if (req.file) product.imagePath = `/uploads/products/${req.file.filename}`;
    await existing.update(product);
    if (req.file && previousImage) {
      const oldFile = path.join(__dirname, "../public", previousImage.replace(/^\//, ""));
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }
    if (req.get("accept")?.includes("application/json")) return res.json({ success: true, message: "Product updated successfully" });
    req.flash("success_msg", "Product updated successfully.");
    res.redirect("/products");
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    const message = error.name === "SequelizeUniqueConstraintError" ? "Product code already exists." : "Unable to update product.";
    if (req.get("accept")?.includes("application/json")) return res.status(400).json({ success: false, message });
    renderError(res, 400, message, { formProduct: { ...product, id: req.params.id }, formMode: "edit", canManage: true });
  }
};

export const deleteProduct = async (req, res) => {
  if (!(await canManage(req, res))) return;
  try {
    const deleted = await Product.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      if (req.get("accept")?.includes("application/json")) return res.status(404).json({ success: false, message: "Product not found" });
      req.flash("error_msg", "Product not found.");
    } else {
      if (req.get("accept")?.includes("application/json")) return res.json({ success: true, message: "Product deleted successfully" });
      req.flash("success_msg", "Product deleted successfully.");
    }
  } catch (error) {
    if (req.get("accept")?.includes("application/json")) return res.status(500).json({ success: false, message: "Unable to delete product" });
    req.flash("error_msg", "Unable to delete product.");
  }
  res.redirect("/products");
};
