import { Router } from 'express';
import { incidentController } from '../controllers/incident.controller';
import { validateQuery, validateBody, validateParams } from '../middleware/validate';
import { incidentQuerySchema, createIncidentSchema, updateIncidentSchema } from '../validators/incident.validator';
import { idParamSchema } from '../validators/common.validator';

const router = Router();

router.get('/', validateQuery(incidentQuerySchema), (req, res, next) => incidentController.getIncidents(req, res, next));
router.get('/:id', validateParams(idParamSchema), (req, res, next) => incidentController.getIncidentById(req, res, next));
router.post('/', validateBody(createIncidentSchema), (req, res, next) => incidentController.createIncident(req, res, next));
router.patch('/:id', validateParams(idParamSchema), validateBody(updateIncidentSchema), (req, res, next) => incidentController.updateIncident(req, res, next));

export default router;
