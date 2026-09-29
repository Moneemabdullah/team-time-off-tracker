import { Router } from 'express';

import { requireAdmin, requireAuth } from '../middleware/auth';
import * as requestController from '../controllers/request.controller';

const router = Router();

router.use(requireAuth);

router.post('/', requestController.createRequest);
router.get('/', requestController.getRequests);
router.patch('/:id', requireAdmin, requestController.updateRequestStatus);

export default router;
