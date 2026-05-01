
'use client';

import { useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '../provider';

export type UserRole = 'admin' | 'vendedor' | 'cliente';

export function useUser() {
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        
        // Bootstrap: Identificar al administrador maestro por correo
        if (authUser.email === 'deinerfernandez@gmail.com') {
          setRole('admin');
          setLoading(false);
          return;
        }

        // Intentar obtener el rol desde Firestore para otros usuarios
        try {
          const userDoc = await getDoc(doc(db, 'users', authUser.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role as UserRole);
          } else {
            // Por defecto, si no está en la base de datos de staff, es un cliente
            setRole('cliente');
          }
        } catch (e) {
          console.error("Error fetching user role:", e);
          setRole('cliente');
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth, db]);

  return { user, role, loading };
}
