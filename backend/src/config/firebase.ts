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

  // Reuse existing app if already initialized elsewhere
  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    firestoreDb = getFirestoreAdmin(firebaseApp);
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

  if (emulatorHost) {
    // Emulator mode — no real credentials needed
    credentialType = "emulator";
    logger.info({ emulatorHost, projectId }, "Initializing Firebase Admin with Firestore Emulator");
    firebaseApp = initializeApp({ projectId });
  } else if (saPath) {
    if (!fs.existsSync(saPath)) {
      throw new FirebaseConfigurationError(
        `Firebase service account file not found at: "${saPath}". Check FIREBASE_SERVICE_ACCOUNT_PATH.`
      );
    }
    try {
      const saContent = JSON.parse(fs.readFileSync(saPath, "utf-8"));
      credentialType = "service_account_path";
      firebaseApp = initializeApp({
        credential: cert(saContent),
        projectId: saContent.project_id || projectId,
      });
    } catch (err) {
      throw new FirebaseConfigurationError(
        `Failed to parse service account file at "${saPath}": ${err instanceof Error ? err.message : String(err)}`
      );
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
      throw new FirebaseConfigurationError(
        `Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${err instanceof Error ? err.message : String(err)}`
      );
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
    throw new FirebaseConfigurationError(
      "Firebase Admin credentials are not configured. Set one of:\n" +
        "  1) FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 (local emulator)\n" +
        "  2) FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json\n" +
        "  3) FIREBASE_SERVICE_ACCOUNT_KEY='{...}'\n" +
        "  4) FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY\n" +
        "  5) GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json"
    );
  }

  firestoreDb = getFirestoreAdmin(firebaseApp);
  firestoreDb.settings({ ignoreUndefinedProperties: true });

  logger.info(
    { projectId, credentialType, isEmulator: Boolean(emulatorHost) },
    "Firebase Admin SDK initialized successfully"
  );

  return {
    app: firebaseApp,
    db: firestoreDb,
    config: { projectId, isEmulator: Boolean(emulatorHost), credentialType },
  };
};

export const getFirestore = () => {
  if (!firestoreDb) return initFirebase().db;
  return firestoreDb;
};

export const getAuth = () => {
  if (!firebaseApp) initFirebase();
  return getAuthAdmin(firebaseApp!);
};

export const closeFirebase = async () => {
  if (firebaseApp) {
    await deleteApp(firebaseApp);
    firebaseApp = null;
    firestoreDb = null;
    logger.info("Firebase Admin connection closed");
  }
};
