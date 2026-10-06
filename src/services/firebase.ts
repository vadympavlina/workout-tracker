import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';

/**
 * Firebase web config. These values are public by design (they ship in every
 * web app); access is enforced by Auth + Realtime Database security rules in
 * `database.rules.json`, not by keeping this secret.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyA9cteK53k7ie5mVEkCcQvA_kiBY7ssSaY',
  authDomain: 'workout-tracker-91340.firebaseapp.com',
  databaseURL: 'https://workout-tracker-91340-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'workout-tracker-91340',
  storageBucket: 'workout-tracker-91340.firebasestorage.app',
  messagingSenderId: '328728824697',
  appId: '1:328728824697:web:5fe3e2acf12587a301bda8',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
auth.languageCode = 'uk';
export const db = getDatabase(firebaseApp);

// Test builds (`vite build --mode emulator`) talk to the local Firebase emulators.
if (import.meta.env.VITE_FIREBASE_EMULATORS === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectDatabaseEmulator(db, '127.0.0.1', 9000);
}
