import { Router } from 'express';

import authRoutes from './auth.routes';
import requestRoutes from './request.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/requests', requestRoutes);

export default router;
