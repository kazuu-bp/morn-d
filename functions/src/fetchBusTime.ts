
// Functions v2 の HTTPS モジュールをインポート
import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URLSearchParams } from 'url'; // Node.js の組み込みモジュール
import * as logger from "firebase-functions/logger";

// Firebase Admin SDK の初期化
admin.initializeApp();

/**
 * バス1便の出発時刻と到着時刻を格納するためのインターフェース
 */
interface BusTimeEntry {
  deptTime?: string; // 出発時刻
  destTime?: string; // 到着時刻
}

/**
 * _fetchBusTime 関数の戻り値の型
 */
type BusTimeData = BusTimeEntry[];

/**
 * クライアントからのリクエストデータの型定義
 */
interface fetchBusTimeRequestData {
  dept: string; // 出発するバス停の名前
  dest: string; // 到着するバス停の名前
}

/**
 * Callable Function のレスポンスデータの型定義
 * クライアント側で result.data で受け取るオブジェクトの型
 */
interface fetchBusTimeResponseData {
  status: 'success' | 'error';
  message: string;
  busTimeData?: BusTimeData; // 成功時にバス時刻データを含める
  errorCode?: string; // エラー時にエラーコードを含める (HttpsErrorのcodeに対応)
}

/**
 * 出発バス停と到着バス停をURLに埋め込み、リクエストを送信し、時刻をスクレイピングします。
 *
 * @param {string} dept - 出発するバス停の名前
 * @param {string} dest - 到着するバス停の名前
 * @returns {Promise<BusTimeData>} スクレイピングした時刻データ。エラー時は例外をスロー。
 */
async function _fetchBusTime(dept: string, dest: string): Promise<BusTimeData> {
  try {
    const busTimeEntries: BusTimeEntry[] = [];
    const baseUrl = 'https://odakyu.bus-navigation.jp/wgsys/wgs/bus.htm';

    const params = new URLSearchParams();
    params.append('tabName', 'searchTab');
    params.append('from', dept);
    params.append('to', dest);
    params.append('locale', 'ja');
    params.append('bsid', '1');

    const url = `${baseUrl}?${params.toString()}`;

    const response = await axios.get<string>(url);

    if (response.status !== 200) {
      const errorMessage = `HTTPエラー: ${response.status} - ${response.statusText} for URL: ${url}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    const $: cheerio.CheerioAPI = cheerio.load(response.data);
    const list = $('#buslist').text().trim();

    const extractedPredictedDeptTimes: string[] = [];
    const predictionDeptMatches = list.matchAll(/発車予測\s+(\d{2}:\d{2})/g);
    for (const match of predictionDeptMatches) {
      if (match[1]) {
        extractedPredictedDeptTimes.push(match[1]);
      }
    }

    const extractedPlannedDestTimes: string[] = [];
    const predictionDestMatches = list.matchAll(/到着予測\s+(\d{2}:\d{2})/g);
    for (const match of predictionDestMatches) {
      if (match[1]) {
        extractedPlannedDestTimes.push(match[1]);
      }
    }

    // 最大4便分のデータを取得
    for (let i = 0; i < Math.min(4, extractedPredictedDeptTimes.length, extractedPlannedDestTimes.length); i++) {
      busTimeEntries.push({
        deptTime: extractedPredictedDeptTimes[i],
        destTime: extractedPlannedDestTimes[i]
      });
    }

    return busTimeEntries;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    const errorMessage = `バス時刻データの取得中にエラーが発生しました: ${message || error}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Callable Function: Firebase Web App から呼び出され、
 * 認証されたユーザーからのリクエストに基づいてバス時刻をスクレイピングします。
 *
 * Functions v2 では、`onCall` の引数は `functions.CallableRequest` 型で提供されます。
 * このオブジェクトには、クライアントからの `data` と認証情報 `auth` が含まれます。
 */
const fetchBusTime = functions.onCall(async (request: functions.CallableRequest<fetchBusTimeRequestData>): Promise<fetchBusTimeResponseData> => {
  // --- デバッグログの出力 ---
  // Functions のログでデータと認証情報を確認するために使用
  logger.info('--- fetchBusTime Function Call Start (v2) ---');

  // request.data は安全に JSON.stringify() できる
  logger.info('Received data object:', JSON.stringify(request.data));

  // request.auth は通常安全に JSON.stringify() できるが、念のため必要な部分だけログに出す
  // あるいは、context.auth オブジェクトが持つ情報だけをログに出す
  logger.info('Received auth object UID:', request.auth?.uid);
  logger.info('Received auth object Email:', request.auth?.token?.email);
  logger.info('Received auth object Name:', request.auth?.token?.name);


  // 1. ユーザー認証の確認
  // request.auth が存在しない場合（ユーザーがログインしていない場合）はエラーをスロー
  if (!request.auth) {
    logger.warn('Authentication required: The function must be called while authenticated.');
    throw new functions.HttpsError(
      'unauthenticated', // HTTPステータスコード401に対応
      'この関数は認証されたユーザーからのみ呼び出すことができます。'
    );
  }

  // 認証されたユーザーのUIDとメールアドレスをログに出力
  // v2 では auth オブジェクトのプロパティに直接アクセスします。
  const uid = request.auth.uid;
  const email = request.auth.token?.email; // token はオプションなので ?. で安全にアクセス
  const displayName = request.auth.token?.name;
  logger.info(`認証済みユーザー (UID: ${uid}, Email: ${email}, DisplayName: ${displayName}) からのバス時刻取得リクエストを受信しました。`);

  // 2. クライアントから渡されたデータの検証
  // request.data は fetchBusTimeRequestData 型として既に定義されているため、安全にアクセスできます
  const { dept, dest } = request.data;

  if (typeof dept !== 'string' || typeof dest !== 'string' || !dept || !dest) {
    logger.error('Invalid request data:', { dept, dest });
    throw new functions.HttpsError(
      'invalid-argument', // HTTPステータスコード400に対応
      '出発バス停 (dept) と到着バス停 (dest) が正しく指定されていません。',
      { receivedData: request.data } // 詳細なエラー情報をクライアントに返す
    );
  }

  try {
    // 3. バス時刻のスクレイピングを実行
    const busTimeData: BusTimeData = await _fetchBusTime(dept, dest);

    // 4. 結果をクライアントに返す
    if (busTimeData.length > 0) {
      logger.info('バス時刻データの取得に成功しました。', busTimeData);
      return {
        status: 'success',
        message: 'バス時刻データを取得しました。',
        busTimeData: busTimeData,
      };
    } else {
      // スクレイピングは成功したが、時刻データが見つからなかった場合
      logger.warn(`指定された条件 (${dept} -> ${dest}) のバス時刻データが見つかりませんでした。`);
      return {
        status: 'success', // 技術的には成功（エラーではない）
        message: '指定されたバス停間の時刻データが見つかりませんでした。',
        busTimeData: [], // 空の配列を返す
      };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // _fetchBusTime 関数からスローされたエラーをキャッチ
    logger.error(`バス時刻取得処理中に予期せぬエラーが発生しました: ${message}`);
    throw new functions.HttpsError(
      'internal', // HTTPステータスコード500に対応
      'バス時刻データの取得中にサーバーエラーが発生しました。',
      { originalError: message } // 必要に応じて元のエラーメッセージを返す
    );
  } finally {
    logger.info('--- fetchBusTime Function Call End (v2) ---');
  }
});

export default fetchBusTime;
