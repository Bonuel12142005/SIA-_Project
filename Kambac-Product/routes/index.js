
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
    
import express from "express";
const router = express.Router();
router.get("/", (req, res) => {
  res.redirect(req.session.userId ? "/products" : "/login");
});

import { loginPage, registerPage, forgotPasswordPage, loginUser, registerUser, logoutUser } from "../controllers/authController.js";
import { productPage, newProductPage, viewProduct, getProductJson, createProduct, editProductPage, updateProduct, deleteProduct, uploadProductImage } from "../controllers/productController.js";
import { overviewPage } from "../controllers/dashboardController.js";
import { accountPage } from "../controllers/accountController.js";

router.get("/overview", (req, res) => res.redirect("/products"));
router.get("/account", (req, res) => res.redirect("/products"));
router.get("/login", loginPage);
router.post("/login", loginUser);
router.get("/register", registerPage);
router.post("/register", registerUser);
router.get("/forgot-password", forgotPasswordPage);
router.get("/logout", logoutUser);

router.get("/products", productPage);
router.get("/products/new", newProductPage);
router.get("/products/:id/edit", editProductPage);
router.get("/products/:id", getProductJson);
router.post("/products", uploadProductImage, createProduct);
router.post("/products/add", uploadProductImage, createProduct);
router.post("/products/:id/update", uploadProductImage, updateProduct);
router.post("/products/:id/delete", deleteProduct);

export default router;
