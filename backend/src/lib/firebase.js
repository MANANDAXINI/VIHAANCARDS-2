let adminApp = null;

async function getFirebaseAdmin() {
  if (adminApp) return adminApp;

  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");

  if (getApps().length) {
    adminApp = { auth: getAuth() };
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is not configured.");
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    let credentials;
    try {
      credentials = JSON.parse(serviceAccountJson);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON.");
    }
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
