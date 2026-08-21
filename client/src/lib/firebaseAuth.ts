import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signOut,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: "portal-virtus.firebaseapp.com",
  projectId: "portal-virtus",
  storageBucket: "portal-virtus.firebasestorage.app",
  messagingSenderId: "983572616449",
  appId: "1:983572616449:web:608217af877f66941a3700",
  measurementId: "G-PXP1N8XFTH",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
firebaseAuth.languageCode = "pt-BR";

export function observeFirebaseAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function getCurrentIdToken() {
  return firebaseAuth.currentUser?.getIdToken();
}

export async function signOutFirebase() {
  await signOut(firebaseAuth);
}

export async function startGoogleLogin() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(firebaseAuth, provider);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (
      code === "auth/popup-blocked" ||
      code === "auth/cancelled-popup-request"
    ) {
      await signInWithRedirect(firebaseAuth, provider);
      return;
    }
    throw error;
  }
}

export async function sendEmailLoginLink(email: string) {
  await sendSignInLinkToEmail(firebaseAuth, email, {
    url: `${window.location.origin}/auth/finish`,
    handleCodeInApp: true,
  });
  localStorage.setItem("virtus-email-for-sign-in", email);
}
