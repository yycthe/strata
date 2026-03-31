type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export function hasFirebaseClientConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  );
}

export function getFirebaseClientConfig(): FirebaseClientConfig {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  const missingVars = [
    ['NEXT_PUBLIC_FIREBASE_API_KEY', apiKey],
    ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', authDomain],
    ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', projectId],
    ['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', storageBucket],
    ['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', messagingSenderId],
    ['NEXT_PUBLIC_FIREBASE_APP_ID', appId],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingVars.length > 0) {
    throw new Error('Firebase client configuration is incomplete.');
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  } as FirebaseClientConfig;
}
