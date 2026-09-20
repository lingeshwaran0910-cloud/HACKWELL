import { Router } from 'express';
import { zoneController } from '../controllers/zone.controller';
import { validateQuery, validateBody, validateParams } from '../middleware/validate';
import { zoneQuerySchema, createZoneSchema, updateZoneSchema } from '../validators/zone.validator';
import { idParamSchema } from '../validators/common.validator';

const router = Router();

router.get('/', validateQuery(zoneQuerySchema), (req, res, next) => zoneController.getZones(req, res, next));
router.get('/:id', validateParams(idParamSchema), (req, res, next) => zoneController.getZoneById(req, res, next));
router.post('/', validateBody(createZoneSchema), (req, res, next) => zoneController.createZone(req, res, next));
router.patch('/:id', validateParams(idParamSchema), validateBody(updateZoneSchema), (req, res, next) => zoneController.updateZone(req, res, next));
router.delete('/:id', validateParams(idParamSchema), (req, res, next) => zoneController.deleteZone(req, res, next));

export default router;
