require('dotenv').config({ path: '.env' });
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkCredits() {
  const creditsRef = collection(db, 'credits');
  const creditsSnapshot = await getDocs(creditsRef);
  creditsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`Credit ${doc.id}: IMEI: "${data.imei}", isLocked: ${data.isMdmLocked}`);
  });
}

checkCredits().catch(console.error);
