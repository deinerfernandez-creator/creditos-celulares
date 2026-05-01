
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

let firebaseApp: FirebaseApp;
let firestore: Firestore;
let auth: Auth;

export function initializeFirebase() {
  const isConfigValid = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== '' && firebaseConfig.apiKey !== 'undefined';

  if (getApps().length > 0) {
    firebaseApp = getApp();
  } else {
    // Si la config no es válida, usamos una de respaldo para evitar crashes, 
    // pero Firestore dará error de permisos o proyecto no encontrado.
    firebaseApp = initializeApp(isConfigValid ? firebaseConfig : {
      apiKey: "placeholder-key",
      authDomain: "placeholder.firebaseapp.com",
      projectId: "tecnicell-placeholder",
      storageBucket: "tecnicell-placeholder.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef"
    });
  }

  firestore = getFirestore(firebaseApp);
  auth = getAuth(firebaseApp);

  return { firebaseApp, firestore, auth };
}

export { FirebaseProvider, useFirebase, useFirebaseApp, useFirestore, useAuth } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useUser } from './auth/use-user';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
