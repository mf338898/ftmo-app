import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAkBaHi-S7y89S8dIDTCIxSTkWMFwQfA50",
  authDomain: "ftmo-journal-web.firebaseapp.com",
  projectId: "ftmo-journal-web",
  storageBucket: "ftmo-journal-web.firebasestorage.app",
  messagingSenderId: "496340812270",
  appId: "1:496340812270:web:c5f04999eaa156c28f0eff",
};

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
    return app;
  }

  app = initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseFirestore(): Firestore {
  return getFirestore(getFirebaseApp());
}

