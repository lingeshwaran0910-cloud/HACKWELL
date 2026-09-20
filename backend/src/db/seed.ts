/**
 * SafeCity AI — Demo User Seeding Script
 *
 * Creates the four initial demo Firebase Authentication accounts and
 * corresponding Firestore user profiles + username index documents.
 *
 * SECURITY: Passwords are managed ONLY by Firebase Authentication.
 * Plaintext passwords are NEVER stored in Firestore.
 *
 * This script is IDEMPOTENT — running it multiple times is safe.
 */

import dotenv from "dotenv";
dotenv.config();

import { initFirebase, getAuth, getFirestore } from "../config/firebase";
import { COLLECTIONS } from "./collections";

interface DemoUser {
  username: string;
  password: string;
  name: string;
  role: string;
  department: string;
  operatorId: string;
  avatar: string;
  permissions: string[];
}

// Demo user definitions — passwords only in memory, never persisted
const DEMO_USERS: DemoUser[] = [
  {
    username: "lingesh",
    password: "lingesh1234",
    name: "Lingeshwaran",
    role: "EOC Shift Lead",
    department: "Emergency Operations Center",
    operatorId: "EOC-001",
    avatar: "L",
    permissions: ["ALL"],
  },
  {
    username: "abishek",
    password: "abishek1234",
    name: "Abishek",
    role: "Fire Operations Officer",
    department: "Fire & Rescue Service",
    operatorId: "FIR-003",
    avatar: "A",
    permissions: ["INCIDENTS", "FIRE_RESOURCES", "MAP", "ACTIVITY"],
  },
  {
    username: "balamurugan",
    password: "balamurugan1234",
    name: "Bala Murugan",
    role: "City Intelligence Lead",
    department: "Urban Intelligence & GIS",
    operatorId: "INT-004",
    avatar: "BM",
    permissions: ["ALL"],
  },
  {
    username: "sivakumar",
    password: "sivakumar1234",
    name: "Siva Kumar",
    role: "Medical Operations Officer",
    department: "Emergency Medical Services",
    operatorId: "MED-002",
    avatar: "SK",
    permissions: ["INCIDENTS", "HOSPITALS", "AMBULANCES", "MAP"],
  },
];

/**
 * Normalizes a username for consistent lookup (lowercase, trimmed).
 */
const normalizeUsername = (username: string) => username.toLowerCase().trim();

/**
 * Converts username to a synthetic Firebase email format.
 * Firebase Authentication requires email; we map usernames via this convention.
 */
const usernameToEmail = (username: string) =>
  `${normalizeUsername(username)}@safecity.local`;

interface SeedResult {
  username: string;
  uid: string;
  status: "created" | "verified" | "error";
  error?: string;
}

async function seedDemoUsers(): Promise<void> {
  console.log("🌱 SafeCity AI — Demo User Seeding Script");
  console.log("==========================================");

  initFirebase();
  const auth = getAuth();
  const db = getFirestore();

  const results: SeedResult[] = [];

  for (const user of DEMO_USERS) {
    const email = usernameToEmail(user.username);
    const normalizedUsername = normalizeUsername(user.username);

    try {
      let uid: string;
      let status: "created" | "verified";

      // Step 1: Check if Firebase Auth account exists
      try {
        const existingUser = await auth.getUserByEmail(email);
        uid = existingUser.uid;
        status = "verified";
        console.log(`✓ ${user.username} — Auth account exists (uid: ${uid.slice(0, 8)}...)`);
      } catch (err: unknown) {
        // User does not exist — create it
        const authCode = (err as { code?: string }).code;
        if (authCode === "auth/user-not-found") {
          const created = await auth.createUser({
            email,
            password: user.password,
            displayName: user.name,
          });
          uid = created.uid;
          status = "created";
          console.log(`+ ${user.username} — Auth account created (uid: ${uid.slice(0, 8)}...)`);
        } else {
          throw err;
        }
      }

      // Step 2: Create/update Firestore user profile (NO PASSWORD here)
      const userProfile = {
        uid,
        username: normalizedUsername,
        name: user.name,
        role: user.role,
        department: user.department,
        operatorId: user.operatorId,
        avatar: user.avatar,
        permissions: user.permissions,
        email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection(COLLECTIONS.USERS).doc(uid).set(userProfile, { merge: true });

      // Step 3: Create/update username index for fast lookup
      const usernameIndexDoc = {
        uid,
        username: normalizedUsername,
        updatedAt: new Date().toISOString(),
      };
      await db
        .collection(COLLECTIONS.USERNAME_INDEX)
        .doc(normalizedUsername)
        .set(usernameIndexDoc, { merge: true });

      results.push({ username: user.username, uid, status });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`✗ ${user.username} — Error: ${errMsg}`);
      results.push({ username: user.username, uid: "unknown", status: "error", error: errMsg });
    }
  }

  console.log("\n==========================================");
  console.log("📊 Seeding Results:");
  for (const r of results) {
    const icon = r.status === "error" ? "✗" : r.status === "created" ? "+" : "✓";
    console.log(`  ${icon} ${r.username}: ${r.status}${r.error ? ` (${r.error})` : ""}`);
  }

  const errors = results.filter((r) => r.status === "error");
  if (errors.length > 0) {
    console.error(`\n⚠️  ${errors.length} user(s) failed to seed.`);
    process.exit(1);
  } else {
    console.log(`\n✅ All ${results.length} demo users seeded successfully.`);
    process.exit(0);
  }
}

seedDemoUsers().catch((err) => {
  console.error("Fatal seeding error:", err);
  process.exit(1);
});
