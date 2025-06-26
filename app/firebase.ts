// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// 環境変数からFirebase設定を読み込む
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Firebase アプリの初期化はここで一度だけ行う
const app = initializeApp(firebaseConfig);

// 各サービスのインスタンスを取得
const auth = getAuth(app);
const functions = getFunctions(app);

// ローカルエミュレータを使用する場合のみ有効化
if (process.env.NODE_ENV === 'development') {
  console.log("Connecting to Firebase emulators...");
  connectFunctionsEmulator(functions, 'localhost', 5001); // Functionsエミュレータ
  connectAuthEmulator(auth, 'http://localhost:9099');     // Authエミュレータ
}

// 初期化済みの各サービスをエクスポート
export { app, auth, functions };