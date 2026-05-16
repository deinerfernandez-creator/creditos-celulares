import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { getDeviceByImei, lockDevice, unlockDevice } from '@/lib/manageengine';

// Inicializar Firebase Client (solo lectura pública permitida por las reglas actuales)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Este endpoint es llamado por Vercel Cron
export async function GET(request: Request) {
  // Verificar un secreto para asegurarnos que solo Vercel (o nosotros) pueda llamar este cron
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Obtener todos los créditos activos
    const creditsRef = collection(db, 'credits');
    const q = query(creditsRef, where('status', '==', 'activo'));
    const creditsSnapshot = await getDocs(q);

    // 2. Obtener todos los pagos
    const paymentsRef = collection(db, 'payments');
    const paymentsSnapshot = await getDocs(paymentsRef);
    const allPayments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    let lockedCount = 0;
    let unlockedCount = 0;

    for (const creditDoc of creditsSnapshot.docs) {
      const credit = creditDoc.data();
      const creditId = creditDoc.id;

      if (!credit.imei) continue;

      // Calcular si está en mora
      const creditPayments = allPayments.filter(p => p.creditId === creditId);
      const totalPaid = creditPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      const startDate = credit.createdAt?.toDate ? credit.createdAt.toDate() : new Date(credit.createdAt);
      const frequencyDays = credit.paymentFrequency === 'semanal' ? 7 : 15;
      
      let amountDue = 0;
      const today = new Date();

      for (let i = 1; i <= credit.planType; i++) {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + (i * frequencyDays));
        
        // Agregar 1 día de gracia (mora > 1 día)
        const graceDate = new Date(dueDate);
        graceDate.setDate(graceDate.getDate() + 1);

        if (today > graceDate) {
          amountDue += Number(credit.installmentAmount);
        }
      }

      const isOverdue = totalPaid < amountDue;

      // Comunicar con MDM
      const device = await getDeviceByImei(credit.imei);
      if (device) {
        if (isOverdue) {
          await lockDevice(device.device_id, `Equipo bloqueado por mora. Total pendiente vencido: $${amountDue - totalPaid}. Contacte a Tecnicell Créditos.`);
          lockedCount++;
        } else {
          // Si no está en mora, mandamos comando de desbloqueo (ManageEngine ignora si ya está desbloqueado)
          await unlockDevice(device.device_id);
          unlockedCount++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: creditsSnapshot.size, 
      lockedCount, 
      unlockedCount 
    });

  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
