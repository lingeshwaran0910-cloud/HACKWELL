import { Router } from 'express';
import { evidenceController } from '../controllers/evidence.controller';
import { validateQuery, validateBody, validateParams } from '../middleware/validate';
import { evidenceQuerySchema, createEvidenceSchema, updateEvidenceSchema } from '../validators/evidence.validator';
import { idParamSchema } from '../validators/common.validator';

const router = Router();

router.get('/', validateQuery(evidenceQuerySchema), (req, res, next) => evidenceController.getEvidence(req, res, next));
router.get('/:id', validateParams(idParamSchema), (req, res, next) => evidenceController.getEvidenceById(req, res, next));
router.post('/', validateBody(createEvidenceSchema), (req, res, next) => evidenceController.createEvidence(req, res, next));
router.patch('/:id', validateParams(idParamSchema), validateBody(updateEvidenceSchema), (req, res, next) => evidenceController.updateEvidence(req, res, next));

export default router;
