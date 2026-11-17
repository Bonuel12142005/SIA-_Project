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

// Protected Dashboard & Livestock Routes
router.get('/dashboard', isAuthenticated, livestockController.dashboard);
router.post('/livestock', isAuthenticated, livestockController.store);
router.get('/livestock/api/:id', isAuthenticated, livestockController.getDetails);
router.post('/livestock/:id/update', isAuthenticated, livestockController.update);
router.post('/livestock/:id/archive', isAuthenticated, livestockController.archive);

// Archived Livestock Routes
router.get('/livestock/archived', isAuthenticated, livestockController.archivedList);
router.post('/livestock/:id/restore', isAuthenticated, livestockController.restore);

// Member Management Routes
router.get('/members', isAuthenticated, memberController.index);
router.post('/members', isAuthenticated, memberController.create);
router.post('/members/:id/update', isAuthenticated, memberController.update);
router.post('/members/:id/toggle', isAuthenticated, memberController.toggleStatus);
router.get('/api/members', isAuthenticated, memberController.apiList);

export default router;
