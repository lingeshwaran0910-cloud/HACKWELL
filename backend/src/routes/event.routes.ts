import { Router } from 'express';
import { systemEventController } from '../controllers/event.controller';
import { validateQuery, validateBody, validateParams } from '../middleware/validate';
import { systemEventQuerySchema, createSystemEventSchema } from '../validators/event.validator';
import { idParamSchema } from '../validators/common.validator';

const router = Router();

router.get('/', validateQuery(systemEventQuerySchema), (req, res, next) => systemEventController.getEvents(req, res, next));
router.get('/:id', validateParams(idParamSchema), (req, res, next) => systemEventController.getEventById(req, res, next));
router.post('/', validateBody(createSystemEventSchema), (req, res, next) => systemEventController.createEvent(req, res, next));

export default router;
