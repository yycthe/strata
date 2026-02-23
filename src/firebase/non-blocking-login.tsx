'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // CRITICAL: Call signInAnonymously directly. Do NOT use 'await signInAnonymously(...)'.
  signInAnonymously(authInstance);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  // CRITICAL: Call createUserWithEmailAndPassword directly. Do NOT use 'await createUserWithEmailAndPassword(...)'.
  createUserWithEmailAndPassword(authInstance, email, password);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/**
 * Initiate email/password sign-in (non-blocking).
 * If the user does not exist, it attempts to create a new user with the same credentials.
 */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password)
    .catch((error) => {
      // If sign-in fails because the user doesn't exist (indicated by invalid-credential),
      // we attempt to create a new account for them. This provides a seamless "sign-up or sign-in" experience
      // for the test user button.
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        // CRITICAL: Call createUserWithEmailAndPassword directly. Do NOT use 'await'.
        createUserWithEmailAndPassword(authInstance, email, password)
          .catch((signUpError) => {
            // This inner catch can be used to handle errors during sign-up,
            // for example if the password is too weak. For this test user, we can log it.
            console.error("Test user sign-up failed after sign-in attempt failed:", signUpError);
          });
      } else {
        // Handle other sign-in errors (e.g., wrong password for an existing user)
        console.error("Test user sign-in error:", error);
      }
    });
}
