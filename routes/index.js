import express from 'express';
import * as authController from '../app/controllers/authController.js';
import * as livestockController from '../app/controllers/livestockController.js';
import * as memberController from '../app/controllers/memberController.js';
import { isAuthenticated } from '../app/middleware/authMiddleware.js';

const router = express.Router();

// Health Check Endpoint (for Docker / orchestrators)
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public Authentication Routes
router.get('/', (req, res) => res.redirect('/dashboard'));
router.get('/login', authController.showLogin);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// 1. Overview (Dashboard)
router.get('/dashboard', isAuthenticated, livestockController.dashboard);
router.get('/overview', isAuthenticated, (req, res) => res.redirect('/dashboard'));

// 2. Members Management
router.get('/members', isAuthenticated, memberController.index);
router.post('/members', isAuthenticated, memberController.create);
router.post('/members/:id/update', isAuthenticated, memberController.update);
router.post('/members/:id/toggle', isAuthenticated, memberController.toggleStatus);
router.get('/api/members', isAuthenticated, memberController.apiList);

// 3. Loans Management
router.get('/loans', isAuthenticated, (req, res) => {
  res.render('placeholder', {
    title: 'Loan Management',
    moduleIcon: 'wallet',
    description: 'Track cooperative member loan releases, payment schedules, balances, and interest computations.',
    actionLabel: 'New Loan Application',
    activeNav: 'loans'
  });
});

// 4. Livestock Management (Active & Operations)
router.get('/livestock', isAuthenticated, (req, res) => res.redirect('/dashboard'));
router.post('/livestock', isAuthenticated, livestockController.store);
router.get('/livestock/api/:id', isAuthenticated, livestockController.getDetails);
router.post('/livestock/:id/update', isAuthenticated, livestockController.update);
router.post('/livestock/:id/archive', isAuthenticated, livestockController.archive);
router.get('/livestock/archived', isAuthenticated, livestockController.archivedList);
router.post('/livestock/:id/restore', isAuthenticated, livestockController.restore);

// 5. Products Management
router.get('/products', isAuthenticated, (req, res) => {
  res.render('placeholder', {
    title: 'Product Inventory',
    moduleIcon: 'shopping-bag',
    description: 'Manage cooperative feeds, veterinary supplies, livestock by-products, and retail inventory.',
    actionLabel: 'Add Product Item',
    activeNav: 'products'
  });
});

// 6. Equipment Management
router.get('/equipment', isAuthenticated, (req, res) => {
  res.render('placeholder', {
    title: 'Equipment Borrowing & Assets',
    moduleIcon: 'wrench',
    description: 'Oversee farm machinery, veterinary equipment, member borrowing schedules, and maintenance logs.',
    actionLabel: 'Register Equipment',
    activeNav: 'equipment'
  });
});

// 7. Announcements Management
router.get('/announcements', isAuthenticated, (req, res) => {
  res.render('placeholder', {
    title: 'Announcements & Bulletins',
    moduleIcon: 'bell-ring',
    description: 'Publish cooperative bulletins, vaccination drives, general assembly notices, and livestock news.',
    actionLabel: 'Post Announcement',
    activeNav: 'announcements'
  });
});

// Profile & Account Settings Routes
router.get('/profile', isAuthenticated, (req, res) => {
  res.render('profile', {
    title: 'My Administrator Profile - KAMBAC',
    activeNav: ''
  });
});

router.get('/settings', isAuthenticated, (req, res) => {
  res.render('profile', {
    title: 'Account Settings - KAMBAC',
    activeNav: ''
  });
});

export default router;
