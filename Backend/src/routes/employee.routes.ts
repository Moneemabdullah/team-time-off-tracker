import { Router } from 'express';

import * as employeeController from '../controllers/employee.controller';

const router = Router();

router.post('/', employeeController.create);
router.get('/', employeeController.list);
router.get('/:id', employeeController.getById);
router.post('/reassign-annual-leave', employeeController.resassaingAnualLeave);

export default router;
