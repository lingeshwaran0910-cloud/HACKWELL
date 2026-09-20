import { Router } from 'express';
import { resourceController } from '../controllers/resource.controller';
import { validateQuery, validateBody, validateParams } from '../middleware/validate';
import { resourceQuerySchema, createResourceSchema, updateResourceSchema } from '../validators/resource.validator';
import { idParamSchema } from '../validators/common.validator';

const router = Router();

router.get('/', validateQuery(resourceQuerySchema), (req, res, next) => resourceController.getResources(req, res, next));
router.get('/:id', validateParams(idParamSchema), (req, res, next) => resourceController.getResourceById(req, res, next));
router.post('/', validateBody(createResourceSchema), (req, res, next) => resourceController.createResource(req, res, next));
router.patch('/:id', validateParams(idParamSchema), validateBody(updateResourceSchema), (req, res, next) => resourceController.updateResource(req, res, next));

export default router;
