import { Router } from 'express';

import { requireAuth } from '../middleware/auth';
import * as userController from '../controllers/user.controller';

const router = Router();

router.use(requireAuth);

// The only non-admin route here; everything else moved to /admin/users.
router.get('/me',requireAuth, userController.getMe);
router.patch('/users/:id',requireAuth, userController.updateById);
export default router;
