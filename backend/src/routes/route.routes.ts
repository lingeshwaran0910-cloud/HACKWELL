import { Router } from 'express';
import { routeController } from '../controllers/route.controller';
import { validateQuery, validateBody, validateParams } from '../middleware/validate';
import { routeQuerySchema, createRouteSchema, updateRouteSchema } from '../validators/route.validator';
import { idParamSchema } from '../validators/common.validator';

const router = Router();

router.get('/', validateQuery(routeQuerySchema), (req, res, next) => routeController.getRoutes(req, res, next));
router.get('/:id', validateParams(idParamSchema), (req, res, next) => routeController.getRouteById(req, res, next));
router.post('/', validateBody(createRouteSchema), (req, res, next) => routeController.createRoute(req, res, next));
router.patch('/:id', validateParams(idParamSchema), validateBody(updateRouteSchema), (req, res, next) => routeController.updateRoute(req, res, next));

export default router;
