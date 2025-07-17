import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// VITEから環境変数を読み込む
const firebaseConfig = {
  apiKey: import.meta.env.VITE_APP_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_APP_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_APP_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_FIREBASE_APP_ID
};

// 環境変数が設定されているか確認
if (
  !firebaseConfig.apiKey ||
  !firebaseConfig.authDomain ||
  !firebaseConfig.projectId ||
  !firebaseConfig.storageBucket ||
  !firebaseConfig.messagingSenderId ||
  !firebaseConfig.appId
) {
  throw new Error("Firebase config is not set in .env file.");
}

// Firebase アプリの初期化はここで一度だけ行う
const app = initializeApp(firebaseConfig);

// 各サービスのインスタンスを取得
const auth = getAuth(app);
const functions = getFunctions(app);
const db = getFirestore(app);

// 開発環境の場合のみエミュレータに接続
if (import.meta.env.DEV) {
  console.log("Connecting to Firebase emulators...");
  connectFunctionsEmulator(functions, 'localhost', 5001); // Functionsエミュレータ
  connectAuthEmulator(auth, 'http://localhost:9099');     // Authエミュレータ
  connectFirestoreEmulator(db, 'localhost', 8080);        // Firestoreエミュレータ
}

// 初期化済みの各サービスをエクスポート
export { app, auth, functions, db };