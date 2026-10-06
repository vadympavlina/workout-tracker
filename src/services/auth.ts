import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as fbSignOut, type User } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from './firebase';

/**
 * Email + password sign-in. There is deliberately no sign-up: accounts are
 * created by the owner in the Firebase console.
 */

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Невірний email або пароль.',
  'auth/invalid-login-credentials': 'Невірний email або пароль.',
  'auth/wrong-password': 'Невірний email або пароль.',
  'auth/user-not-found': 'Невірний email або пароль.',
  'auth/invalid-email': 'Некоректний email.',
  'auth/user-disabled': 'Цей акаунт вимкнено. Звернись до адміністратора.',
  'auth/too-many-requests': 'Забагато спроб. Спробуй трохи пізніше або віднови пароль.',
  'auth/network-request-failed': 'Немає з’єднання з інтернетом.',
  'auth/missing-email': 'Вкажи email.',
};

export function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) return MESSAGES[error.code] ?? `Помилка входу (${error.code}).`;
  return 'Щось пішло не так. Спробуй ще раз.';
}

export const signIn = (email: string, password: string) => signInWithEmailAndPassword(auth, email.trim(), password);

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email.trim());

export const signOut = () => fbSignOut(auth);

export const watchAuth = (callback: (user: User | null) => void) => onAuthStateChanged(auth, callback);

export type { User };
