let adminApp = null;

function loadServiceAccountCredentials() {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
  if (base64) {
    try {
      return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is invalid.");
    }
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON. Paste the minified one-line JSON from Firebase, or use FIREBASE_SERVICE_ACCOUNT_BASE64 instead."
    );
  }
}

async function getFirebaseAdmin() {
  if (adminApp) return adminApp;

  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");

  if (getApps().length) {
    adminApp = { auth: getAuth() };
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is not configured.");
  }

  const credentials = loadServiceAccountCredentials();
  if (credentials) {
    initializeApp({
      credential: cert(credentials),
      projectId,
    });
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is required on the server for Google sign-in.");
  } else {
    initializeApp({ projectId });
  }

  adminApp = { auth: getAuth() };
  return adminApp;
}

async function verifyGoogleIdToken(idToken) {
  const { auth } = await getFirebaseAdmin();
  return auth.verifyIdToken(idToken);
}

module.exports = { verifyGoogleIdToken };
