import { Router } from "express";
import { liveInputController } from "../controllers/liveInput.controller";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// POST /api/inputs — protected (operators ingest live signals)
router.post("/", authMiddleware, liveInputController.ingestInput);

// GET /api/inputs — protected (view live feed)
router.get("/", authMiddleware, liveInputController.getInputs);

export const liveInputRoutes = router;
