
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
    // Si no hay configuración válida, inicializamos con un objeto vacío para evitar que la app explote,
    // pero las funciones de Auth y Firestore fallarán con errores descriptivos.
    firebaseApp = initializeApp(isConfigValid ? firebaseConfig : {
      apiKey: "MISSING_API_KEY",
      authDomain: "missing-project.firebaseapp.com",
      projectId: "missing-project",
      storageBucket: "missing-project.appspot.com",
      messagingSenderId: "000000000",
      appId: "0:000000000:web:000000000"
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
