import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { FeedingEventRecord, FeedingEventType } from '../types/babyEvent';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * 過去7日間の授乳データ（ミルクと母乳）を取得する関数
 * 
 * @param userId - ユーザーID（認証されたユーザーのUID）
 * @returns Promise<FeedingEventRecord[]> - 授乳イベントの配列（時系列順）
 */
export async function getFeedingDataLast7Days(): Promise<FeedingEventRecord[]> {
  logger.info('getFeedingDataLast7Days called');

  const db = admin.firestore();

  // 7日前の日時を計算（時分秒をリセットして日付のみに）
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0); // その日の始まり（00:00:00）に設定

  const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

  logger.info('Query parameters', {
    sevenDaysAgo: sevenDaysAgo.toISOString(),
    sevenDaysAgoTimestamp: sevenDaysAgoTimestamp,
    currentTime: new Date().toISOString()
  });

  try {
    // ミルクと母乳の両方を対象とするクエリ
    const feedingTypes: FeedingEventType[] = ['ミルク', '母乳'];

    const querySnapshot = await db.collection('babyEvents')
      //.where('userId', '==', userId) // ユーザーIDでフィルタリング
      .where('event', 'in', feedingTypes)
      .where('timestamp', '>=', sevenDaysAgoTimestamp)
      .orderBy('timestamp', 'desc') // 最新から古い順にソート
      .get();

    const feedingEvents: FeedingEventRecord[] = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      feedingEvents.push({
        id: doc.id,
        event: data.event as FeedingEventType,
        timestamp: data.timestamp,
        note: data.note || '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });

    logger.info(`Successfully retrieved ${feedingEvents.length} feeding events from last 7 days`);

    return feedingEvents;

  } catch (error) {
    logger.error('Error retrieving feeding data from last 7 days:', error);
    throw new Error(`Failed to retrieve feeding data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 指定された期間の授乳データを取得する関数
 * 
 * @param fromDate - 開始日時
 * @param toDate - 終了日時
 * @returns Promise<FeedingEventRecord[]> - 授乳イベントの配列（時系列順）
 */
export async function getFeedingDataByDateRange(
  fromDate: Date,
  toDate: Date
): Promise<FeedingEventRecord[]> {
  logger.info('getFeedingDataByDateRange called', {
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString()
  });

  const db = admin.firestore();

  const fromTimestamp = Timestamp.fromDate(fromDate);
  const toTimestamp = Timestamp.fromDate(toDate);

  try {
    const feedingTypes: FeedingEventType[] = ['ミルク', '母乳'];

    const querySnapshot = await db.collection('babyEvents')
      .where('event', 'in', feedingTypes)
      .where('timestamp', '>=', fromTimestamp)
      .where('timestamp', '<=', toTimestamp)
      .orderBy('timestamp', 'desc')
      .get();

    const feedingEvents: FeedingEventRecord[] = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      feedingEvents.push({
        id: doc.id,
        event: data.event as FeedingEventType,
        timestamp: data.timestamp,
        note: data.note || '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });

    logger.info(`Successfully retrieved ${feedingEvents.length} feeding events from date range`);

    return feedingEvents;

  } catch (error) {
    logger.error('Error retrieving feeding data by date range:', error);
    throw new Error(`Failed to retrieve feeding data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 最新の授乳イベントを取得する関数
 * 
 * @param limit - 取得する件数（デフォルト: 1）
 * @returns Promise<FeedingEventRecord[]> - 最新の授乳イベント配列
 */
export async function getLatestFeedingEvents(limit: number = 1): Promise<FeedingEventRecord[]> {
  logger.info('getLatestFeedingEvents called', { limit });

  const db = admin.firestore();

  try {
    const feedingTypes: FeedingEventType[] = ['ミルク', '母乳'];

    const querySnapshot = await db.collection('babyEvents')
      //.where('userId', '==', userId) // ユーザーIDでフィルタリング
      .where('event', 'in', feedingTypes)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const feedingEvents: FeedingEventRecord[] = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      feedingEvents.push({
        id: doc.id,
        event: data.event as FeedingEventType,
        timestamp: data.timestamp,
        note: data.note || '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });

    logger.info(`Successfully retrieved ${feedingEvents.length} latest feeding events`);

    return feedingEvents;

  } catch (error) {
    logger.error('Error retrieving latest feeding events:', error);
    throw new Error(`Failed to retrieve latest feeding events: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}