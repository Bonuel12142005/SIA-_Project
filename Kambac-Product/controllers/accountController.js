import { User } from "../models/userModel.js";

const requireUser = (req, res) => {
  if (!req.session.userId) {
    res.redirect("/login");
    return false;
  }
  return true;
};

export const accountPage = async (req, res) => {
  if (!requireUser(req, res)) return;
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user) return res.redirect("/login");
    const account = user.toJSON();
    res.render("account", {
      title: "Account",
      user: account,
      userInitial: account.name.charAt(0).toUpperCase()
    });
  } catch (error) {
    console.error("Account page failed:", error.message);
    res.status(500).render("account", {
      title: "Account",
      pageError: "Unable to load your account. Please try again."
    });
  }
};
