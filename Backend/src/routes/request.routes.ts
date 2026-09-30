import { Router } from 'express';

import { requireAuth } from '../middleware/auth';
import * as requestController from '../controllers/request.controller';

const router = Router();

router.use(requireAuth);

// Scoped to the caller. The all-requests view lives at /admin/requests.
router.get('/', requestController.getMyRequests);
router.post('/', requestController.createRequest);

export default router;
