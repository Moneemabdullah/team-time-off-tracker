import { Router } from 'express';

import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';
import requestRoutes from './request.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/requests', requestRoutes);
router.use('/users', userRoutes);
// Admin-only surface. Anything below this point requires the ADMIN role.
router.use('/admin', adminRoutes);

export default router;
