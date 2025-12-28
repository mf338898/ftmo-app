import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let app: App | null = null;

export function getFirebaseAdminApp(): App {
  if (app) return app;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase admin credentials are missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.",
    );
  }

  app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

  return app;
}

export const db = getFirestore(getFirebaseAdminApp());

