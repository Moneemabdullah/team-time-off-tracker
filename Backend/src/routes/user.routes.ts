import { Router } from 'express';

import { requireAuth, requireAdmin } from '../middleware/auth';
import * as userController from '../controllers/user.controller';

const router = Router();

router.use(requireAuth);

// Declared before `/:id` so `me` is never treated as an id.
router.get('/me',requireAuth, userController.getMe);
router.post('/reassign-annual-leave', requireAdmin, userController.reassignAnnualLeave);

router.get('/', requireAdmin, userController.list);
router.get('/:id', requireAdmin, userController.getById);

export default router;
