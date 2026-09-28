import { Router } from 'express';

import * as requestController from '../controllers/request.controller';

const router = Router();

router.post('/', requestController.create);
router.get('/', requestController.list);
router.patch('/:id', requestController.updateStatus);

export default router;
