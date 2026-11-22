import { Op } from "sequelize";
import { Product } from "../models/productModel.js";
import { User } from "../models/userModel.js";

const requireUser = (req, res) => {
  if (!req.session.userId) {
    res.redirect("/login");
    return false;
  }
  return true;
};

export const overviewPage = async (req, res) => {
  if (!requireUser(req, res)) return;
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user) return res.redirect("/login");

    const [total, available, lowStock, outOfStock, recentProducts] = await Promise.all([
      Product.count(),
      Product.count({ where: { quantity: { [Op.gt]: 10 }, status: "active" } }),
      Product.count({ where: { quantity: { [Op.between]: [1, 10] }, status: "active" } }),
      Product.count({ where: { quantity: 0, status: "active" } }),
      Product.findAll({ order: [["updatedAt", "DESC"]], limit: 5 })
    ]);

    res.render("overview", {
      title: "Overview",
      user: user.toJSON(),
      summary: { total, available, lowStock, outOfStock },
      recentProducts: recentProducts.map((product) => {
        const value = product.toJSON();
        return {
          ...value,
          stockStatus: value.quantity === 0 ? "out_of_stock" : value.quantity <= 10 ? "low_stock" : "available",
          stockLabel: value.quantity === 0 ? "Out of stock" : `${value.quantity} in stock`
        };
      }),
      userInitial: user.name.charAt(0).toUpperCase()
    });
  } catch (error) {
    console.error("Overview failed:", error.message);
    res.status(500).render("overview", {
      title: "Overview",
      summary: { total: 0, available: 0, lowStock: 0, outOfStock: 0 },
      recentProducts: [],
      userInitial: "",
      pageError: "Unable to load the overview. Please try again."
    });
  }
};
