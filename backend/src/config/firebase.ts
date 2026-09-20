import fs from "fs";
import { initializeApp, cert, getApps, deleteApp, applicationDefault } from "firebase-admin/app";
import { getFirestore as getFirestoreAdmin } from "firebase-admin/firestore";
import { getAuth as getAuthAdmin } from "firebase-admin/auth";
import { logger } from "./logger";

export class FirebaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseConfigurationError";
  }
}

let firebaseApp: ReturnType<typeof initializeApp> | null = null;
let firestoreDb: ReturnType<typeof getFirestoreAdmin> | null = null;
let firebaseInitialized = false;
let firebaseSkipped = false;

/**
 * Attempts to initialize Firebase Admin SDK.
 * Returns null gracefully if no Firebase credentials are configured —
 * the core auth system now uses local bcrypt+JWT, so Firebase is optional.
 */
export const initFirebase = () => {
  // Return cached instance if available
  if (firebaseApp && firestoreDb) {
    const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
    return {
      app: firebaseApp,
      db: firestoreDb,
      config: {
        projectId: firebaseApp.options.projectId ?? "unknown",
        isEmulator,
        credentialType: isEmulator ? "emulator" : "adc",
      },
    };
  }

  // If we already determined Firebase is not configured, skip silently
  if (firebaseSkipped) return null;

  // Reuse existing app if already initialized elsewhere
  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    firestoreDb = getFirestoreAdmin(firebaseApp);
    firebaseInitialized = true;
    const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
    return {
      app: firebaseApp,
      db: firestoreDb,
      config: {
        projectId: firebaseApp.options.projectId ?? "unknown",
        isEmulator,
        credentialType: isEmulator ? "emulator" : "adc",
      },
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || "safecity-ai-dev";
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const saKeyRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const googleAppCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  let credentialType = "adc";

  try {
    if (emulatorHost) {
      // Emulator mode — no real credentials needed
      credentialType = "emulator";
      logger.info({ emulatorHost, projectId }, "Initializing Firebase Admin with Firestore Emulator");
      firebaseApp = initializeApp({ projectId });
    } else if (saPath) {
      if (!fs.existsSync(saPath)) {
        logger.warn({ saPath }, "Firebase service account file not found — Firebase disabled");
        firebaseSkipped = true;
        return null;
      }
      try {
        const saContent = JSON.parse(fs.readFileSync(saPath, "utf-8"));
        credentialType = "service_account_path";
        firebaseApp = initializeApp({
          credential: cert(saContent),
          projectId: saContent.project_id || projectId,
        });
      } catch (err) {
        logger.warn({ err }, "Failed to parse Firebase service account file — Firebase disabled");
        firebaseSkipped = true;
        return null;
      }
    } else if (saKeyRaw) {
      try {
        const saContent = JSON.parse(saKeyRaw);
        credentialType = "service_account_key";
        firebaseApp = initializeApp({
          credential: cert(saContent),
          projectId: saContent.project_id || projectId,
        });
      } catch (err) {
        logger.warn({ err }, "Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY — Firebase disabled");
        firebaseSkipped = true;
        return null;
      }
    } else if (clientEmail && privateKey) {
      const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");
      credentialType = "env_fields";
      firebaseApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey: formattedPrivateKey }),
        projectId,
      });
    } else if (googleAppCreds) {
      credentialType = "adc";
      firebaseApp = initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    } else {
      // No Firebase credentials configured — this is expected in development
      // Core auth uses local bcrypt+JWT, so Firebase is optional
      logger.info(
        "Firebase credentials not configured — Firebase features disabled. " +
          "Core authentication uses local bcrypt+JWT (no Firebase required)."
      );
      firebaseSkipped = true;
      return null;
    }

    firestoreDb = getFirestoreAdmin(firebaseApp);
    firestoreDb.settings({ ignoreUndefinedProperties: true });
    firebaseInitialized = true;

    logger.info(
      { projectId, credentialType, isEmulator: Boolean(emulatorHost) },
      "Firebase Admin SDK initialized successfully"
    );

    return {
      app: firebaseApp,
      db: firestoreDb,
      config: { projectId, isEmulator: Boolean(emulatorHost), credentialType },
    };
  } catch (err) {
    logger.warn({ err }, "Firebase initialization failed — Firebase features disabled");
    firebaseSkipped = true;
    return null;
  }
};

export const getFirestore = () => {
  if (!firestoreDb) initFirebase();
  return firestoreDb;
};

export const getAuth = () => {
  if (!firebaseApp) initFirebase();
  if (!firebaseApp) return null;
  return getAuthAdmin(firebaseApp);
};

export const isFirebaseAvailable = () => firebaseInitialized && !firebaseSkipped;

export const closeFirebase = async () => {
  if (firebaseApp) {
    await deleteApp(firebaseApp);
    firebaseApp = null;
    firestoreDb = null;
    firebaseInitialized = false;
    logger.info("Firebase Admin connection closed");
  }
};
