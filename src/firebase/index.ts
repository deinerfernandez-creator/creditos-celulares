'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

let firebaseApp: FirebaseApp;
let firestore: Firestore;
let auth: Auth;

export function initializeFirebase() {
  // Verificación básica para evitar errores de inicialización si la configuración está vacía
  const isConfigValid = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined';

  if (getApps().length > 0) {
    firebaseApp = getApp();
  } else {
    // Si no hay config válida, usamos un objeto vacío para evitar el crash inmediato en desarrollo,
    // aunque los servicios de Firebase no funcionarán hasta que se configure correctamente.
    firebaseApp = initializeApp(isConfigValid ? firebaseConfig : {
      apiKey: "placeholder-key",
      authDomain: "placeholder.firebaseapp.com",
      projectId: "placeholder-project",
      storageBucket: "placeholder.appspot.com",
      messagingSenderId: "placeholder",
      appId: "placeholder"
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
