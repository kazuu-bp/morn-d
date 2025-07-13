import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
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

  let event: string;
  let eventTimeStamp: admin.firestore.Timestamp = admin.firestore.Timestamp.now();
  let note: string;

  try {
    // 4. コンテンツをパースしてイベント情報（時刻、イベント名、メモ）を抽出
    const timeRegex = /(\d{1,2}:\d{2})/;
    const timeMatch = content.match(timeRegex);

    let textToParse = content;

    // 時刻がテキストに含まれている場合
    if (timeMatch) {
      const timeStr = timeMatch[1];
      // テキストから時刻部分を削除
      textToParse = content.replace(timeRegex, '').trim();

      const [hours, minutes] = timeStr.split(':').map(Number);
      const eventDate = new Date();
      eventDate.setHours(hours, minutes, 0, 0);

      // パースした時刻が未来の場合（例: 0:10に「23:50」と入力）、前日の日付にする
      if (eventDate > new Date()) {
        eventDate.setDate(eventDate.getDate() - 1);
      }
      eventTimeStamp = admin.firestore.Timestamp.fromDate(eventDate);
    }

    // 残りのテキストをイベント名とメモに分割
    const parts = textToParse.split(/\s+/).filter(p => p);
    if (parts.length === 0) {
      logger.error('Invalid request data: Event name is missing.');
      response.status(400).send({
        status: 'error',
        message: 'イベント名が含まれていません。'
      });
      return;
    }

    event = parts[0];
    note = parts.slice(1).join(' ');

    // 5. Firestoreにデータを保存
    // ユーザーごとのデータを保存するために、'users/{uid}/babyEvents' のような構造を想定
    const db = admin.firestore();
    const babyEventRef = db.collection('users').doc('test').collection('babyEvents');

    const newEventData = {
      event: event,
      timestamp: eventTimeStamp,
      note: note,
      fileName: fileName, // 新しく追加されたfileName
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // サーバー側での記録日時
    };

    const docRef = await babyEventRef.add(newEventData);
    logger.info(`Successfully inserted baby event with ID: ${docRef.id} for user: test`);

    // 6. 成功レスポンスを返す
    response.status(200).send({
      status: 'success',
      message: '育児イベントを正常に登録しました。',
      docId: docRef.id,
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
