import { Router } from 'express';
import { AdminUsersController } from '../controllers/admin-users.controller';

const router = Router();

// POST /admin-users - Create new admin user
router.post('/', AdminUsersController.createAdminUser);

// GET /admin-users - Get all admin users
router.get('/', AdminUsersController.getAllAdminUsers);

// GET /admin-users/:id - Get admin user by ID
router.get('/:id', AdminUsersController.getAdminUserById);

// PUT /admin-users/:id - Update admin user
router.put('/:id', AdminUsersController.updateAdminUser);

// DELETE /admin-users/:id - Delete admin user
router.delete('/:id', AdminUsersController.deleteAdminUser);

// POST /admin-users/init - Initialize admin users table
router.post('/init', AdminUsersController.initializeTable);

export default router;
