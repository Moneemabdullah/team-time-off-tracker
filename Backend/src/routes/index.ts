import { Router } from 'express';

import requestRoutes from './request.routes';

const router = Router();

router.use('/requests', requestRoutes);

export default router;
