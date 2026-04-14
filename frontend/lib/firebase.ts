// /**
//  * lib/firebase.ts
//  * Initialises Firebase using environment variables only.
//  * Real credentials live in .env.local — never in source code.
//  *
//  * Required vars (set in .env.local — see .env.local.example):
//  *   NEXT_PUBLIC_FIREBASE_API_KEY
//  *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
//  *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
//  *   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
//  *   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
//  *   NEXT_PUBLIC_FIREBASE_APP_ID
//  *   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID  (optional — Analytics only)
//  */

// import { initializeApp, getApps } from "firebase/app";
// import { getAuth } from "firebase/auth";

// const requiredVars = [
//   "NEXT_PUBLIC_FIREBASE_API_KEY",
//   "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
//   "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
//   "NEXT_PUBLIC_FIREBASE_APP_ID",
// ] as const;

// // Warn clearly in development if any required env var is missing
// if (process.env.NODE_ENV === "development") {
//   for (const key of requiredVars) {
//     if (!process.env[key]) {
//       console.warn(
//         `[Firebase] Missing env var: ${key}. ` +
//           "Copy .env.local.example → .env.local and fill in your values."
//       );
//     }
//   }
// }

// const firebaseConfig = {
//   apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//   authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
//   measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
// };

// // Prevent re-initialising on hot-reload in development
// const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// export const auth = getAuth(app);

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const hasFirebase = !!(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID
);

const app = hasFirebase
  ? getApps().length === 0
    ? initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      })
    : getApps()[0]
  : null;

export const auth = app ? getAuth(app) : null;