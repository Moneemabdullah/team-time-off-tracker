import { Router } from 'express';

import authRoutes from './auth.routes';
import requestRoutes from './request.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/requests', requestRoutes);

export default router;
