
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
import { homePage } from "../controllers/homeController.js";
const router = express.Router();
router.get("/", homePage);

import {
  loginPage,
  registerPage,
  membershipApplicationPage,
  submitMembershipApplication,
  forgotPasswordPage,
  dashboardPage,
  dashboardPreviewPage,
  loginUser,
  registerUser,
  logoutUser,
  applicationsPage,
  approveApplication,
  rejectApplication,
  auditLogPage,
  memberIdCardPage,
  memberProfilePage as memberAccountPage,
  updateMemberProfile
} from "../controllers/authController.js";
import {
  membersPage,
  newMemberPage,
  createMember,
  editMemberPage,
  updateMember,
  memberProfilePage,
  archivedMembersPage,
  exportMembersCsv,
  membersPdfPage,
  renewalsPage,
  recordMembershipPayment,
  archiveMember,
  restoreMember,
  listMembersApi,
  getMemberApi,
  createMemberApi,
  updateMemberApi,
  updateMemberApiById,
  archiveMemberApi,
  restoreMemberApi
} from "../controllers/membersController.js";

router.get("/login", loginPage);
router.post("/login", loginUser);
router.get("/register", registerPage);
router.post("/register", registerUser);
router.get("/member/application", membershipApplicationPage);
router.post("/member/application", submitMembershipApplication);
router.get("/forgot-password", forgotPasswordPage);
router.get("/preview", dashboardPreviewPage);
router.get("/dashboard", dashboardPage);
router.get("/admin/applications", applicationsPage);
router.post("/admin/applications/:id/approve", approveApplication);
router.post("/admin/applications/:id/reject", rejectApplication);
router.get("/admin/audit", auditLogPage);
router.get("/member/id-card", memberIdCardPage);
router.get("/member/profile", memberAccountPage);
router.post("/member/profile", updateMemberProfile);
router.get("/members", membersPage);
router.get("/members/archive", archivedMembersPage);
router.get("/members/renewals", renewalsPage);
router.post("/members/:id/payments", recordMembershipPayment);
router.get("/members/export.csv", exportMembersCsv);
router.get("/members/export.pdf", membersPdfPage);
router.get("/members/new", newMemberPage);
router.post("/members", createMember);
router.get("/members/:id/edit", editMemberPage);
router.post("/members/:id", updateMember);
router.post("/members/:id/archive", archiveMember);
router.post("/members/:id/restore", restoreMember);
router.get("/members/:id", memberProfilePage);
router.get("/api/members", listMembersApi);
router.post("/api/members", createMemberApi);
router.put("/api/members/:id", updateMemberApiById);
router.get("/api/members/:memberId", getMemberApi);
router.patch("/api/members/:memberId", updateMemberApi);
router.delete("/api/members/:memberId", archiveMemberApi);
router.post("/api/members/:memberId/restore", restoreMemberApi);
router.get("/logout", logoutUser);

export default router;
