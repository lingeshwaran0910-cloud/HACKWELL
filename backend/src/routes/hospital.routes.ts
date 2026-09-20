import { Router } from 'express';
import { hospitalController } from '../controllers/hospital.controller';
import { validateQuery, validateBody, validateParams } from '../middleware/validate';
import { hospitalQuerySchema, createHospitalSchema, updateHospitalSchema } from '../validators/hospital.validator';
import { idParamSchema } from '../validators/common.validator';

const router = Router();

router.get('/', validateQuery(hospitalQuerySchema), (req, res, next) => hospitalController.getHospitals(req, res, next));
router.get('/:id', validateParams(idParamSchema), (req, res, next) => hospitalController.getHospitalById(req, res, next));
router.post('/', validateBody(createHospitalSchema), (req, res, next) => hospitalController.createHospital(req, res, next));
router.patch('/:id', validateParams(idParamSchema), validateBody(updateHospitalSchema), (req, res, next) => hospitalController.updateHospital(req, res, next));

export default router;
