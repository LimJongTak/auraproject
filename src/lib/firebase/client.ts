import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";
import { type FirebaseStorage, getStorage } from "firebase/storage";
import { type Functions, getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// True once real values from a created Firebase project are in .env.local
// (see SETUP.md). Before that, apiKey etc. are empty strings and Firebase SDK
// calls throw synchronously — <FirebaseConfigGate> in layout.tsx checks this
// and shows a setup notice instead of mounting the app, so nothing below
// actually gets called until it's configured.
export const firebaseConfigured = Object.values(firebaseConfig).every((v) => !!v);

function getFirebaseApp(): FirebaseApp {
  const apps = getApps();
  if (apps.length > 0) return apps[0];
  return initializeApp(firebaseConfig);
}

// Firebase Auth validates apiKey eagerly (throws synchronously on init), which
// would crash `next build`'s server-side prerender pass of "use client" pages
// whenever .env.local isn't filled in yet (e.g. before the Firebase project
// exists). Every real read/write only happens inside useEffect/event handlers
// post-mount, so it's safe to defer actual SDK init to the browser and hand
// back inert stand-ins on the server — they're declared but never dereferenced
// during SSR.
const isBrowser = typeof window !== "undefined";
const canInit = isBrowser && firebaseConfigured;

export const firebaseApp = canInit ? getFirebaseApp() : (undefined as unknown as FirebaseApp);
export const auth: Auth = canInit ? getAuth(firebaseApp) : (undefined as unknown as Auth);
if (canInit) auth.languageCode = "ko";
export const db: Firestore = canInit ? getFirestore(firebaseApp) : (undefined as unknown as Firestore);
export const storage: FirebaseStorage = canInit
  ? getStorage(firebaseApp)
  : (undefined as unknown as FirebaseStorage);
export const functions: Functions = canInit
  ? getFunctions(firebaseApp)
  : (undefined as unknown as Functions);
