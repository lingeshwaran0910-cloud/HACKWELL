import { Router } from "express";
import { reportController } from "../controllers/report.controller";
import { optionalAuthMiddleware } from "../middleware/authMiddleware";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// POST /api/reports — public (anyone can report an emergency)
router.post("/", optionalAuthMiddleware, reportController.createReport);

// GET /api/reports — protected (operators only)
router.get("/", authMiddleware, reportController.getReports);

export const reportRoutes = router;
