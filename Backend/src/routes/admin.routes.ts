import { Router } from 'express';

import { requireAdmin, requireAuth } from '../middleware/auth';
import * as adminController from '../controllers/admin.controller';
import * as requestController from '../controllers/request.controller';
import * as userController from '../controllers/user.controller';

const router = Router();

// Every route below is admin-only, so the guard is applied once here rather
// than repeated per route.
router.use(requireAuth, requireAdmin);

router.get('/requests', adminController.getAllRequests);
router.patch('/requests/:id', requestController.updateRequestStatus);

router.get('/users', userController.list);
router.post('/users', userController.createEmployee);
router.post('/users/reassign-annual-leave', userController.reassignAnnualLeave);
router.get('/users/:id', userController.getById);
router.patch('/users/:id', userController.updateById);
router.delete('/users/:id', userController.deleteById);

export default router;
