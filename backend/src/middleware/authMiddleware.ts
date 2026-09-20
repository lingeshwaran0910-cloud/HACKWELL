import { Request, Response, NextFunction } from "express";
import { getAuth } from "../config/firebase";
import { UnauthorizedError } from "../utils/errors";
import { COLLECTIONS } from "../db/collections";
import { firestoreService } from "../db/firestore";
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

interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  role?: string;
  permissions?: string[];
  operatorId?: string;
}

/**
 * Verifies Firebase ID token in Authorization: Bearer <token> header.
 * Attaches decoded user info + Firestore profile to req.user.
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
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    // Fetch Firestore profile for role/username/permissions
    const profile = await firestoreService.getDocument<UserProfile>(
      COLLECTIONS.USERS,
      decodedToken.uid
    );

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email ?? "",
      username: profile?.username,
      role: profile?.role,
      permissions: profile?.permissions,
      operatorId: profile?.operatorId,
    };

    next();
  } catch (err) {
    logger.warn({ err }, "Firebase token verification failed");
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
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const profile = await firestoreService.getDocument<UserProfile>(
      COLLECTIONS.USERS,
      decodedToken.uid
    );
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email ?? "",
      username: profile?.username,
      role: profile?.role,
      permissions: profile?.permissions,
      operatorId: profile?.operatorId,
    };
  } catch {
    // Silently ignore invalid tokens for optional auth
  }
  next();
};
