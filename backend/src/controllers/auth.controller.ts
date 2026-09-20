import { Request, Response, NextFunction } from "express";
import { loginService, registerService, profileService } from "../services/auth.service";
import { loginSchema, registerSchema } from "../validators/auth.validator";
import { UnauthorizedError, NotFoundError } from "../utils/errors";

export const authController = {
  /**
   * POST /api/auth/login
   * Body: { username, password }
   *
   * The backend validates the username exists and returns a Firebase custom token.
   * The frontend uses this token with Firebase signInWithCustomToken() to obtain a real ID token,
   * which is then used for subsequent authenticated API requests.
   *
   * Note: Because the frontend calls signInWithCustomToken, Firebase internally validates the
   * custom token (signed by Admin SDK). Password verification for existing users happens at
   * Firebase client SDK level. For new seeded accounts, the password is set in Firebase Auth only.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        // Return generic error — do not reveal which field is wrong
        return next(new UnauthorizedError("Invalid username or password"));
      }

      const result = await loginService.login(parsed.data);

      res.status(200).json({
        success: true,
        customToken: result.customToken,
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/auth/register
   * Body: { username, password, confirmPassword?, name, role?, department? }
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        }));
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid registration data", details },
        });
        return;
      }

      const result = await registerService.register(parsed.data);

      res.status(201).json({
        success: true,
        user: result.user,
        message: "Account created. You can now log in.",
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/auth/me
   * Returns the authenticated user's profile.
   * Requires authMiddleware.
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new UnauthorizedError("Authentication required"));
      }

      const profile = await profileService.getProfile(req.user.uid);
      if (!profile) {
        return next(new NotFoundError("User profile not found"));
      }

      res.status(200).json({ success: true, user: profile });
    } catch (err) {
      next(err);
    }
  },
};
