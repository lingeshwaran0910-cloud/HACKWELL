import { Router } from 'express';
import { evidenceController } from '../controllers/evidence.controller';
import { validateQuery, validateBody, validateParams } from '../middleware/validate';
import { evidenceQuerySchema, createEvidenceSchema, updateEvidenceSchema } from '../validators/evidence.validator';
import { idParamSchema } from '../validators/common.validator';
import { videoUpload } from '../middleware/upload';

const router = Router();

// Standard evidence CRUD
router.get('/', validateQuery(evidenceQuerySchema), (req, res, next) => evidenceController.getEvidence(req, res, next));
router.get('/:id', validateParams(idParamSchema), (req, res, next) => evidenceController.getEvidenceById(req, res, next));
router.post('/', validateBody(createEvidenceSchema), (req, res, next) => evidenceController.createEvidence(req, res, next));
router.patch('/:id', validateParams(idParamSchema), validateBody(updateEvidenceSchema), (req, res, next) => evidenceController.updateEvidence(req, res, next));

// Video intelligence pipeline
// GET /api/v1/evidence/video/health — Python service health check
router.get('/video/health', (req, res, next) => evidenceController.getVideoServiceHealth(req, res, next));

// POST /api/v1/evidence/video — upload video, run full AI pipeline, persist Evidence + Incident
router.post(
  '/video',
  (req, res, next) => {
    // Multer error handling: size limit, mime type, etc.
    videoUpload.single('video')(req, res, (err) => {
      if (err) {
        res.status(400).json({
          success: false,
          error: err.message || 'File upload failed',
        });
        return;
      }
      next();
    });
  },
  (req, res, next) => evidenceController.analyzeVideo(req, res, next),
);

export default router;
