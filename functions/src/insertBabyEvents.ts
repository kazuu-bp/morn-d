import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as logger from "firebase-functions/logger";
import { Request, Response } from 'express'; // Express の Request と Response 型をインポート
// Firebase Admin SDK の初期化は、プロジェクトのエントリーポイント（例: index.ts）で一度だけ行います。

/**
 * HTTP Function: クライアントから送信されたJSONデータをパースし、
 * Firestore の 'babyEvents' コレクションに保存します。
 *
 * @param {Request} request - クライアントからのHTTPリクエスト。
 *                                      body プロパティにJSONデータが含まれます。
 * @param {Response} response - サーバーからのHTTPレスポンス。
 */
const insertBabyEvents = functions.onRequest({ cors: true }, async (request: Request, response: Response) => {
  logger.info('--- insertBabyEvent Function Call Start (v2) ---');

  // 1. HTTPメソッドの確認
  if (request.method !== 'POST') {
    logger.warn(`Method Not Allowed: ${request.method}`);
    response.set('Allow', 'POST').status(405).send({
      status: 'error',
      message: 'このエンドポイントはPOSTリクエストのみを受け付けます。'
    });
    return;
  }

  // 2. ユーザー認証の確認 (Firebase Authentication IDトークンを検証)
  /*let uid: string;
  try {
    const idToken = request.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
      logger.warn('Authentication required: No ID token provided.');
      response.status(401).send({
        status: 'error',
        message: '認証が必要です。'
      });
      return;
    }
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    uid = decodedToken.uid;
    logger.info(`Authenticated user UID: ${uid}`);
  } catch (error) {
    logger.error('Error verifying ID token:', error);
    response.status(401).send({
      status: 'error',
      message: '認証トークンの検証に失敗しました。'
    });
    return;
  }*/

  // 3. 受信データの検証とパース
  const { fileName, content } = request.body;

  if (typeof fileName !== 'string' || !fileName.trim()) {
    logger.error('Invalid request data: fileName is missing or not a string.');
    response.status(400).send({
      status: 'error',
      message: '有効なファイル名が提供されていません。'
    });
    return;
  }

  if (typeof content !== 'string' || !content.trim()) {
    logger.error('Invalid request data: content is missing or not a string.');
    response.status(400).send({
      status: 'error',
      message: '有効なコンテンツが提供されていません。'
    });
    return;
  }

  logger.info('Received fileName:', fileName);
  logger.info('Received content:', content);

  try {
    // 4. コンテンツをパースしてイベント情報を抽出
    // 4-1. ファイル名から日付を取得
    const dateMatch = fileName.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (!dateMatch) {
      logger.error('Invalid fileName format: Date could not be parsed from fileName.', fileName);
      response.status(400).send({
        status: 'error',
        message: 'ファイル名から日付を抽出できませんでした。フォーマットは "【ぴよログ】YYYY/M/D.txt" である必要があります。'
      });
      return;
    }
    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1; // month is 0-indexed in JavaScript
    const day = parseInt(dateMatch[3], 10);

    // 4-2. コンテンツを行ごとに分割し、イベントを抽出
    const lines = content.split('\n');
    interface BabyEvent {
      event: string;
      timestamp: Timestamp;
      note: string;
      fileName: string;
      createdAt?: FieldValue;
      updatedAt?: FieldValue;
    }
    const eventsToInsert: BabyEvent[] = [];
    const eventRegex = /^(\d{2}:\d{2})\s+(.+)$/;

    for (const line of lines) {
      const trimmedLine = line.trim();
      const match = trimmedLine.match(eventRegex);

      if (match) {
        const timeStr = match[1];
        const eventText = match[2].trim();

        const [hours, minutes] = timeStr.split(':').map(Number);
        // ファイル名から取得した年月日と、行から取得した時刻でDateオブジェクトを作成
        const eventDate = new Date(year, month, day, hours, minutes);
        const eventTimeStamp = Timestamp.fromDate(eventDate);

        const parts = eventText.split(/\s+/).filter(p => p);
        const event = parts[0];
        const note = parts.slice(1).join(' ');

        eventsToInsert.push({
          event: event,
          timestamp: eventTimeStamp,
          note: note,
          fileName: fileName,
          // createdAt はFirestoreへの書き込み時に設定
        });
      }
    }

    if (eventsToInsert.length === 0) {
      logger.warn('No events found to insert from the content.');
      response.status(200).send({
        status: 'success',
        message: 'コンテンツから登録対象のイベントが見つかりませんでした。',
        docIds: [],
      });
      return;
    }

    // 5. Firestoreにデータをバッチ保存
    const db = admin.firestore();
    const batch = db.batch();
    const babyEventRef = db.collection('users').doc('test').collection('babyEvents');
    const docIds: string[] = [];
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const eventData of eventsToInsert) {
      const existingEventsSnapshot = await babyEventRef
        .where('event', '==', eventData.event)
        .where('timestamp', '==', eventData.timestamp)
        .limit(1)
        .get();

      if (!existingEventsSnapshot.empty) {
        // 既存のイベントが見つかった場合
        const existingDoc = existingEventsSnapshot.docs[0];
        const existingData = existingDoc.data();

        if (existingData.note === eventData.note) {
          // event, timestamp, note が全て同じ場合はスキップ
          logger.info(`Skipping duplicate event: ${eventData.event} at ${eventData.timestamp.toDate().toISOString()}`);
          skippedCount++;
        } else {
          // event, timestamp が同じで note が異なる場合は note を更新
          batch.update(existingDoc.ref, {
            note: eventData.note,
            updatedAt: FieldValue.serverTimestamp(), // 更新日時を追加
          });
          docIds.push(existingDoc.id);
          updatedCount++;
          logger.info(`Updating note for event: ${eventData.event} at ${eventData.timestamp.toDate().toISOString()}`);
        }
      } else {
        // 既存のイベントが見つからなかった場合、新規挿入
        const docRef = babyEventRef.doc(); // 自動IDで新しいドキュメント参照を作成
        batch.set(docRef, {
          ...eventData,
          createdAt: FieldValue.serverTimestamp(), // 新規作成日時を追加
        });
        docIds.push(docRef.id);
        insertedCount++;
        logger.info(`Inserting new event: ${eventData.event} at ${eventData.timestamp.toDate().toISOString()}`);
      }
    }

    await batch.commit();
    logger.info(`Successfully processed baby events for user: test. Inserted: ${insertedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`);
    logger.info(`Total documents processed: ${insertedCount + updatedCount}`);
    logger.info(`Total unique document IDs: ${docIds.length}`);

    // 6. 成功レスポンスを返す
    response.status(200).send({
      status: 'success',
      message: `育児イベントを${eventsToInsert.length}件正常に登録しました。`,
      docIds: docIds,
    });

  } catch (error) {
    // 予期せぬエラー
    logger.error('Failed to insert baby event due to an unexpected error:', error);
    response.status(500).send({
      status: 'error',
      message: '育児イベントの登録中に予期せぬエラーが発生しました。',
      details: (error as Error).message
    });
  }
});

export default insertBabyEvents;
