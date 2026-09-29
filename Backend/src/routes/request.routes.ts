import { Router } from 'express';

import * as requestController from '../controllers/request.controller';

const router = Router();

router.post('/', requestController.createRequest);
router.get('/', requestController.getRequests);
router.patch('/:id', requestController.updateRequestStatus);

export default router;
