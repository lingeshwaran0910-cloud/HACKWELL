/**
 * SafeCity AI — Authentication Service
 *
 * Local bcrypt + JWT authentication using Prisma SQLite.
 * No Firebase dependency required for development or production.
 *
 * Strategy:
 * - Usernames are stored in the Prisma `User` table (unique, lowercased)
 * - Passwords are stored as bcrypt hashes — NEVER plaintext
 * - Authentication returns a JWT signed with JWT_SECRET
 * - The JWT is sent as a Bearer token in subsequent requests
 * - authMiddleware verifies the JWT and attaches req.user
 *
 * Security:
 * - Generic error message for both wrong username and wrong password
 * - Inactive accounts are rejected with the same generic error
 * - Password hash is NEVER included in any API response
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { ConflictError, UnauthorizedError } from "../utils/errors";
import type { LoginInput, RegisterInput } from "../validators/auth.validator";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  username: string;
  name: string;
  role: string;
  department: string;
  operatorId?: string;
  avatar?: string;
  permissions: string[];
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResult {
  /** JWT token — named "customToken" for frontend API compatibility */
  customToken: string;
  user: UserProfile;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeUsername = (username: string) => username.toLowerCase().trim();

/**
 * Converts a Prisma User row to the public UserProfile shape.
 * Never includes passwordHash.
 */
function toUserProfile(user: {
  id: string;
  username: string;
  name: string;
  role: string;
  department: string;
  operatorId: string | null;
  avatar: string;
  permissions: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}): UserProfile {
  let permissions: string[] = ["INCIDENTS", "MAP"];
  try {
    const parsed = JSON.parse(user.permissions);
    if (Array.isArray(parsed)) permissions = parsed;
  } catch {
    // keep default
  }
  return {
    uid: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    department: user.department,
    operatorId: user.operatorId ?? undefined,
    avatar: user.avatar,
    permissions,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Signs a JWT for the given user ID.
 */
function signToken(uid: string): string {
  return jwt.sign(
    { sub: uid, type: "access" },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
  );
}

// ─── Login Service ────────────────────────────────────────────────────────────

export const loginService = {
  /**
   * Authenticates with username + password.
   * Returns a JWT (as `customToken`) and user profile.
   * Never reveals whether the username exists vs password is wrong.
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const normalizedUsername = normalizeUsername(input.username);

    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (!user) {
      logger.warn({ username: normalizedUsername }, "Login failed: username not found");
      throw new UnauthorizedError("Invalid username or password");
    }

    if (!user.active) {
      logger.warn({ username: normalizedUsername, uid: user.id }, "Login failed: account inactive");
      throw new UnauthorizedError("Invalid username or password");
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      logger.warn({ username: normalizedUsername }, "Login failed: wrong password");
      throw new UnauthorizedError("Invalid username or password");
    }

    const token = signToken(user.id);

    logger.info({ username: normalizedUsername, uid: user.id }, "User login successful");

    return {
      customToken: token,
      user: toUserProfile(user),
    };
  },
};

// ─── Register Service ─────────────────────────────────────────────────────────

export const registerService = {
  async register(input: RegisterInput): Promise<{ user: UserProfile }> {
    const normalizedUsername = normalizeUsername(input.username);
    const email = `${normalizedUsername}@safecity.local`;

    const existing = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });
    if (existing) {
      throw new ConflictError("Username is already taken");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const now = new Date().toISOString();

    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        passwordHash,
        name: input.name,
        role: input.role ?? "Operator",
        department: input.department ?? "Emergency Operations",
        email,
        permissions: JSON.stringify(["INCIDENTS", "MAP"]),
        createdAt: now,
        updatedAt: now,
      },
    });

    logger.info({ uid: user.id, username: normalizedUsername }, "New user registered");
    return { user: toUserProfile(user) };
  },
};

// ─── Profile Service ──────────────────────────────────────────────────────────

export const profileService = {
  async getProfile(uid: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) return null;
    return toUserProfile(user);
  },
};

// ─── Token Verification ───────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  type: string;
  iat: number;
  exp: number;
}

/**
 * Verifies a JWT and returns the decoded payload.
 * Throws if the token is invalid or expired.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

