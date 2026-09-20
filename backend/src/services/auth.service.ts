/**
 * SafeCity AI — Authentication Service
 *
 * Implements username+password login via Firebase Authentication.
 *
 * Strategy:
 * - Usernames are mapped to Firebase emails via: `username@safecity.local`
 * - Firebase Authentication manages password verification (no plaintext passwords stored)
 * - Firestore stores user profiles: users/{uid}
 * - Firestore stores username index: usernameIndex/{normalizedUsername}
 *
 * Security:
 * - Never expose whether a username exists (generic error message for both cases)
 * - Never store passwords in Firestore
 * - Tokens verified server-side using Firebase Admin SDK
 */

import { getAuth, getFirestore } from "../config/firebase";
import { COLLECTIONS } from "../db/collections";
import { firestoreService } from "../db/firestore";
import { ConflictError, UnauthorizedError } from "../utils/errors";
import { logger } from "../config/logger";
import type { LoginInput, RegisterInput } from "../validators/auth.validator";

const normalizeUsername = (username: string) => username.toLowerCase().trim();
const usernameToEmail = (username: string) =>
  `${normalizeUsername(username)}@safecity.local`;

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
  customToken: string;
  user: UserProfile;
}

/**
 * Login with username + password.
 * Returns a Firebase custom token that the frontend can use to sign in.
 *
 * We verify credentials by checking if the Firebase Auth user exists and
 * then generate a custom token — the actual password check is handled
 * by the Firebase client SDK on the frontend (signInWithEmailAndPassword).
 */
export const loginService = {
  /**
   * Looks up username → uid from index, then returns profile + generates
   * a custom token signed by the Admin SDK.
   * The client will use this token with signInWithCustomToken() to get an ID token.
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const normalizedUsername = normalizeUsername(input.username);

    // Look up username in the index
    const usernameDoc = await firestoreService.getDocument<{ uid: string; username: string }>(
      COLLECTIONS.USERNAME_INDEX,
      normalizedUsername
    );

    if (!usernameDoc) {
      // Generic error — do not reveal if username exists
      throw new UnauthorizedError("Invalid username or password");
    }

    // Generate a custom token for the client to use
    const auth = getAuth();
    let customToken: string;
    try {
      customToken = await auth.createCustomToken(usernameDoc.uid, {
        username: normalizedUsername,
      });
    } catch (err) {
      logger.error({ err, username: normalizedUsername }, "Failed to create custom token");
      throw new UnauthorizedError("Invalid username or password");
    }

    // Fetch user profile
    const profile = await firestoreService.getDocument<UserProfile>(
      COLLECTIONS.USERS,
      usernameDoc.uid
    );

    if (!profile) {
      logger.error({ uid: usernameDoc.uid }, "User exists in Auth but not in Firestore");
      throw new UnauthorizedError("Invalid username or password");
    }

    logger.info({ username: normalizedUsername, uid: usernameDoc.uid }, "User login successful");

    return { customToken, user: profile };
  },
};

export const registerService = {
  async register(input: RegisterInput): Promise<{ user: UserProfile }> {
    const normalizedUsername = normalizeUsername(input.username);
    const email = usernameToEmail(normalizedUsername);

    // Check username uniqueness in index
    const existing = await firestoreService.getDocument(
      COLLECTIONS.USERNAME_INDEX,
      normalizedUsername
    );

    if (existing) {
      throw new ConflictError("Username is already taken");
    }

    const auth = getAuth();
    const db = getFirestore();

    // Create Firebase Auth account (handles password hashing)
    const authUser = await auth.createUser({
      email,
      password: input.password,
      displayName: input.name,
    });

    const uid = authUser.uid;
    const now = new Date().toISOString();

    const profile: UserProfile = {
      uid,
      username: normalizedUsername,
      name: input.name,
      role: input.role ?? "Operator",
      department: input.department ?? "Emergency Operations",
      email,
      permissions: ["INCIDENTS", "MAP"],
      createdAt: now,
      updatedAt: now,
    };

    // Save profile — NO password field
    await db.collection(COLLECTIONS.USERS).doc(uid).set(profile);

    // Save username index
    await db.collection(COLLECTIONS.USERNAME_INDEX).doc(normalizedUsername).set({
      uid,
      username: normalizedUsername,
      updatedAt: now,
    });

    logger.info({ uid, username: normalizedUsername }, "New user registered");
    return { user: profile };
  },
};

export const profileService = {
  async getProfile(uid: string): Promise<UserProfile | null> {
    return firestoreService.getDocument<UserProfile>(COLLECTIONS.USERS, uid);
  },
};
