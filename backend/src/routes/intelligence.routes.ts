import { Router } from 'express';
import { intelligenceController } from '../controllers/intelligence.controller';

const router = Router();

router.get('/health', intelligenceController.getHealth);
router.post('/test', intelligenceController.testAI);
router.post('/analyze', intelligenceController.analyzeIncident);

export default router;
