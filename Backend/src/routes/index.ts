import { Router } from 'express';

import employeeRoutes from './employee.routes';
import requestRoutes from './request.routes';

const router = Router();

router.use('/employees', employeeRoutes);
router.use('/requests', requestRoutes);

export default router;
