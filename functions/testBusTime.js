// テストコマンド
// npm run serve
// node testBusTime.js

const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable, connectFunctionsEmulator } = require('firebase/functions');

// Firebaseプロジェクトの設定
// エミュレータを使用するため、projectIdは適当なものでOK
const firebaseConfig = {
    projectId: 'dev-morn-d', // firebase.jsonのprojectIdと一致させる
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// Functionsインスタンスを取得 (エミュレータのポートを指定)
// 'us-central1' は関数のリージョン。functions/src/fetchBusTime.tsで指定されているリージョンに合わせる
const functions = getFunctions(app, 'us-central1');

// ↓↓↓ エミュレータへの接続設定を追加 ↓↓↓
// functions.port は firebase.json の "emulators"."functions"."port" の値に合わせる
connectFunctionsEmulator(functions, "localhost", 5001);

// Callable Functionの参照を取得
const fetchBusTimeCallable = httpsCallable(functions, 'fetchBusTimeFunction');

async function testFetchBusTime() {
    try {
        console.log('Calling fetchBusTime with dept: 山野, dest: 調布駅北口');
        const result = await fetchBusTimeCallable({ dept: '山野', dest: '調布駅北口' });
        console.log('Function call successful. Result:', result.data);
    } catch (error) {
        console.error('Function call failed. Error:', error);
        if (error.details) {
            console.error('Error details:', error.details);
        }
    }
}

testFetchBusTime();
