import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../utils/errors";
import { verifyToken, profileService } from "../services/auth.service";
import { logger } from "../config/logger";

// Extend Express Request to include authenticated user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        username?: string;
        role?: string;
        permissions?: string[];
        operatorId?: string;
      };
    }
  }
}

/**
 * Verifies JWT Bearer token in Authorization header.
 * Attaches decoded user info + Prisma profile to req.user.
 * Never trusts req.body.userId as identity proof.
 */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Authorization header with Bearer token is required"));
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (!token) {
    return next(new UnauthorizedError("Bearer token is missing"));
  }

  try {
    // Verify JWT signature and expiry
    const payload = verifyToken(token);

    // Fetch current user profile from Prisma
    const profile = await profileService.getProfile(payload.sub);

    if (!profile) {
      return next(new UnauthorizedError("User account not found"));
    }

    req.user = {
      uid: payload.sub,
      email: profile.email,
      username: profile.username,
      role: profile.role,
      permissions: profile.permissions,
      operatorId: profile.operatorId,
    };

    next();
  } catch (err) {
    logger.warn({ err }, "JWT token verification failed");
    next(new UnauthorizedError("Invalid or expired authentication token"));
  }
};

/**
 * Optional auth — attaches user info if token provided, but doesn't block unauthenticated requests.
 */
export const optionalAuthMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();

  const token = authHeader.slice(7);
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    const profile = await profileService.getProfile(payload.sub);
    if (profile) {
      req.user = {
        uid: payload.sub,
        email: profile.email,
        username: profile.username,
        role: profile.role,
        permissions: profile.permissions,
        operatorId: profile.operatorId,
      };
    }
  } catch {
    // Silently ignore invalid tokens for optional auth
  }
  next();
};

