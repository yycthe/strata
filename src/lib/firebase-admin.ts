import 'server-only';

import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

type FirebaseAdminConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function getFirebaseAdminConfig(): FirebaseAdminConfig | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

export function hasFirebaseAdminConfig(): boolean {
  return getFirebaseAdminConfig() !== null;
}

export function getAdminFirestore(): Firestore {
  const config = getFirebaseAdminConfig();

  if (!config) {
    throw new Error(
      'Missing Firebase admin environment variables. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY before using Firestore on the server.'
    );
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
      }),
    });
  }

  return getFirestore(getApp());
}
