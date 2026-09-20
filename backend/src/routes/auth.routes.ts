import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// POST /api/auth/login — public
router.post("/login", authController.login);

// POST /api/auth/register — public
router.post("/register", authController.register);

// GET /api/auth/me — protected
router.get("/me", authMiddleware, authController.me);

export const authRoutes = router;
