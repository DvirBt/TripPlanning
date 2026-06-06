import type { AuthAdapter } from "./authAdapter";

/**
 * Real Firebase Authentication adapter. Only used when USE_MOCKS=false.
 *
 * This file intentionally does NOT import firebase-admin at the top level so
 * the project installs and runs with zero extra dependencies in mock mode.
 * To enable it:
 *   1. npm install firebase-admin -w server
 *   2. Set USE_MOCKS=false and FIREBASE_SERVICE_ACCOUNT / FIREBASE_PROJECT_ID
 *      in .env (see .env.example).
 *
 * The frontend would then send a real Firebase ID token (from Google Sign-In),
 * and verifyToken() validates it via admin.auth().verifyIdToken().
 */
export function createFirebaseAuth(): AuthAdapter {
  return {
    async verifyToken(_token: string) {
      throw new Error(
        "Firebase auth is not wired up. Install firebase-admin and implement " +
          "verifyIdToken here, or set USE_MOCKS=true to use the mock adapter. " +
          "See server/src/auth/firebaseAuth.ts.",
      );
      // Reference implementation once firebase-admin is installed:
      //
      // const admin = await import("firebase-admin");
      // if (!admin.apps.length) {
      //   admin.initializeApp({
      //     credential: admin.credential.cert(
      //       JSON.parse(config.firebase.serviceAccount),
      //     ),
      //   });
      // }
      // const decoded = await admin.auth().verifyIdToken(_token);
      // return { userId: decoded.uid, email: decoded.email ?? "" };
    },
  };
}