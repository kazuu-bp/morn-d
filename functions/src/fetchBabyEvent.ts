import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import type { BabyEventRecord } from './types/babyEvent';

/**
 * イベント名と件数を指定して、最新のイベントレコードを取得するHTTP Callable関数
 *
 * @param data.eventName - 検索するイベント名 (例: "授乳", "おむつ", etc.)
 * @param data.limit - 取得するレコードの最大件数。デフォルトは10。
 */
export const fetchBabyEvents = onCall(async (request) => {
  logger.info('--- fetchBabyEvents Function Call Start ---');
  logger.info('Received data:', request.data);
  logger.info('Auth context:', request.auth ? { uid: request.auth.uid } : 'No auth context');

  // 認証チェック
  if (!request.auth) {
    // 認証されていない場合はエラーを返します
    logger.warn('Authentication required: The function must be called while authenticated.');
    throw new HttpsError(
      'unauthenticated',
      '認証が必要です。'
    );
  }

  const { eventName, limit: reqLimit } = request.data;
  const limit = reqLimit || 10; // limitが指定されない場合はデフォルトで10件

  // eventNameが必須であることを確認
  if (!eventName || typeof eventName !== 'string') {
    logger.error('Invalid argument: eventName is required and must be a string.', { data: request.data });
    throw new HttpsError(
      'invalid-argument',
      'eventNameは必須の文字列です。'
    );
  }

  // limitが有効な数値であることを確認
  if (typeof limit !== 'number' || limit <= 0 || !Number.isInteger(limit)) {
    logger.error('Invalid argument: limit must be a positive integer.', { data: request.data });
    throw new HttpsError(
      'invalid-argument',
      'limitは正の整数である必要があります。'
    );
  }

  try {
    logger.info(`Querying Firestore for event: "${eventName}" with limit: ${limit}`);
    const db = admin.firestore();
    const querySnapshot = await db.collection('babyEvents')
      .where('event', '==', eventName) // 'event'フィールドが指定されたeventNameと一致する
      .orderBy('timestamp', 'desc') // 'timestamp'フィールドで降順にソート（最新のものが先頭に来るように）
      .limit(limit) // 指定された件数に制限
      .get();



    const records: BabyEventRecord[] = [];
    querySnapshot.forEach(doc => {
      records.push({
        id: doc.id, // ドキュメントIDを含める
        ...doc.data() // ドキュメントのデータ
      } as BabyEventRecord);
    });

    logger.info(`Successfully fetched ${records.length} records for event "${eventName}".`);

    // 構造化されたレスポンスを返します
    return {
      status: 'success',
      message: `${eventName}の最新の${records.length}件のレコードを取得しました。`,
      data: records,
      count: records.length,
      query: {
        eventName: eventName,
        limit: limit
      }
    };

  } catch (error: unknown) {
    // エラーハンドリング
    if (error instanceof HttpsError) {
      // HttpsErrorの場合はそのまま再スロー
      throw error;
    }
    logger.error('Firestoreデータの取得中にエラーが発生しました:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new HttpsError(
      'internal',
      'データの取得中にサーバーエラーが発生しました。',
      errorMessage // デバッグ用にエラーメッセージを含める
    );
  } finally {
    logger.info('--- fetchBabyEvents Function Call End ---');
  }
});
