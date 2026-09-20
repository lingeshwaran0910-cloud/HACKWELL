import { Router } from 'express';
import { recommendationController } from '../controllers/recommendation.controller';
import { validateQuery, validateBody, validateParams } from '../middleware/validate';
import {
  recommendationQuerySchema,
  acceptRecommendationSchema,
  rejectRecommendationSchema,
  modifyRecommendationSchema,
} from '../validators/recommendation.validator';
import { idParamSchema } from '../validators/common.validator';

const router = Router();

router.get('/', validateQuery(recommendationQuerySchema), (req, res, next) => recommendationController.getRecommendations(req, res, next));
router.get('/:id', validateParams(idParamSchema), (req, res, next) => recommendationController.getRecommendationById(req, res, next));
router.post('/:id/accept', validateParams(idParamSchema), validateBody(acceptRecommendationSchema), (req, res, next) => recommendationController.acceptRecommendation(req, res, next));
router.post('/:id/reject', validateParams(idParamSchema), validateBody(rejectRecommendationSchema), (req, res, next) => recommendationController.rejectRecommendation(req, res, next));
router.post('/:id/modify', validateParams(idParamSchema), validateBody(modifyRecommendationSchema), (req, res, next) => recommendationController.modifyRecommendation(req, res, next));

export default router;
