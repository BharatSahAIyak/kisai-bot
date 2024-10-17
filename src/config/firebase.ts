import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: String(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: String(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: String(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: String(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: String(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  measurementId: String(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
};

let app;
let messaging: any;

export const initializeFirebase = () => {
  if (typeof window !== 'undefined' && !getApps().length) {
    if (process.env.NEXT_PUBLIC_FIREBASE_APP_ID) {
      app = initializeApp(firebaseConfig);
      messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
    } else {
      console.log('Firebase configuration not found. Skipping Firebase initialization.');
    }
  }
};

export const requestForToken = async () => {
  if (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  ) {
    try {
      const currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY,
      });
      if (currentToken) {
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } catch (err) {
      console.log('An error occurred while retrieving token:', err);
    }
  }
};

export const onMessageListener = () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FIREBASE_APP_ID) {
    return new Promise((resolve) => {});
  }
  return Promise.resolve(null);
};
