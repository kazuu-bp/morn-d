import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

import { getFeedingDataLast7Days } from './queries/feedingDataQueries';
import {
  calculateFeedingIntervals,
  extractAndCalculateQuantities,
  calculateConfidence,
  calculateAverageInterval,
  calculateAverageQuantity,
  BabyEvent
} from './predictionAlgorithm';
import {
  PredictMilkRequest,
  PredictMilkData,
  FeedingEventRecord
} from './types';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * 次回授乳予測を行うFirebase Function
 * 過去7日間の授乳データを分析して、次回の授乳時刻と量を予測する
 */
export const predictMilkFunction = onCall<PredictMilkRequest>(
  async (request) => {
    logger.info('predictMilkFunction called', {
      uid: request.auth?.uid,
      timestamp: new Date().toISOString()
    });

    try {
      // 1. 認証チェック
      if (!request.auth) {
        logger.warn('Unauthenticated request to predictMilkFunction');
        throw new HttpsError('unauthenticated', '認証が必要です');
      }

      const userId = request.auth.uid;
      logger.info('Processing prediction request');

      // 2. Firestoreからデータ取得
      let feedingEvents: FeedingEventRecord[];
      try {
        feedingEvents = await getFeedingDataLast7Days();
        logger.info(feedingEvents);
        logger.info('Retrieved feeding events', {
          eventCount: feedingEvents.length,
          userId
        });
      } catch (error) {
        logger.error('Failed to retrieve feeding data', { error, userId });
        throw new HttpsError('internal', 'データの取得に失敗しました');
      }

      // 3. データ不足チェック
      if (feedingEvents.length < 2) {
        logger.info('Insufficient data for prediction', {
          eventCount: feedingEvents.length,
          userId
        });
        throw new HttpsError(
          'failed-precondition',
          '予測に十分なデータがありません。少なくとも2回以上の授乳記録が必要です。'
        );
      }

      // 4. データ変換（FeedingEventRecord → BabyEvent）
      const babyEvents: BabyEvent[] = feedingEvents.map(event => (
        {
          event: event.event,
          //timestamp: Timestamp.fromMillis(event.timestamp.seconds * 1000 + event.timestamp.nanoseconds / 1_000_000),
          timestamp: {
            _seconds: event.timestamp.seconds * 1000,
            _nanoseconds: event.timestamp.nanoseconds / 1_000_000
          },
          note: event.note
        }));

      // 時系列順にソート（古い順）
      babyEvents.sort((a, b) => a.timestamp._seconds - b.timestamp._seconds);

      // 5. 予測アルゴリズムの実行
      logger.info('Starting prediction calculation', {
        eventCount: babyEvents.length,
        userId
      });

      // 授乳間隔の計算
      const intervals = calculateFeedingIntervals(babyEvents);
      const averageInterval = calculateAverageInterval(intervals);
      //logger.info('averageInterval', averageInterval);

      if (averageInterval === 0) {
        logger.warn('No valid intervals found for prediction', { userId });
        throw new HttpsError(
          'failed-precondition',
          '有効な授乳間隔が見つかりません。予測を計算できません。'
        );
      }

      // 授乳量の計算
      const quantities = extractAndCalculateQuantities(babyEvents);
      const quantityResult = calculateAverageQuantity(quantities);
      //logger.log('quantityResult', quantityResult);

      // 信頼度の計算
      const confidenceResult = calculateConfidence(babyEvents.length, intervals);
      //logger.log('confidenceResult', confidenceResult);

      // 次回授乳時刻の予測
      const lastFeedingTime = babyEvents[babyEvents.length - 1].timestamp;
      //logger.info('lastFeedingTime', lastFeedingTime);
      const nextFeedingTimeMs = lastFeedingTime._seconds * 1000 + (averageInterval * 60 * 60 * 1000 * 1000);
      //logger.log('nextFeedingTimeMs', nextFeedingTimeMs)
      const nextFeedingTime = Timestamp.fromMillis(nextFeedingTimeMs / 1000);
      //logger.log('nextFeedingTime', nextFeedingTime)

      // データ範囲の計算
      const oldestEvent = babyEvents[0];
      const newestEvent = babyEvents[babyEvents.length - 1];
      //logger.log('oldestEvent.timestamp._seconds', oldestEvent.timestamp._seconds / 1000);
      //logger.log('newestEvent.timestamp._seconds', newestEvent.timestamp._seconds / 1000);

      // 6. レスポンスデータの構築
      const predictionData: PredictMilkData = {
        nextFeedingTime,
        predictedQuantity: {
          amount: quantityResult.average,
          unit: 'ml',
          ...(quantityResult.hasRange && { range: quantityResult.range })
        },
        confidence: confidenceResult.confidence,
        dataRange: {
          from: Timestamp.fromMillis(oldestEvent.timestamp._seconds),
          to: Timestamp.fromMillis(newestEvent.timestamp._seconds),
          eventCount: babyEvents.length
        },
        isPrediction: true,
        averageInterval: {
          hours: Math.floor(averageInterval),
          mins: Math.floor((averageInterval - Math.floor(averageInterval)) * 60)
        }
      };

      logger.info('Prediction calculation completed successfully', {
        userId,
        nextFeedingTime: nextFeedingTime.toDate().toISOString(),
        predictedAmount: quantityResult.average,
        confidence: confidenceResult.confidence,
        dataQuality: confidenceResult.dataQuality,
        eventCount: babyEvents.length
      });

      return {
        status: 'success',
        message: '予測が正常に計算されました',
        data: predictionData
      };

    } catch (error) {
      // HttpsErrorはそのまま再スロー
      if (error instanceof HttpsError) {
        throw error;
      }

      // その他のエラーは内部エラーとして処理
      logger.error('Unexpected error in predictMilkFunction', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        uid: request.auth?.uid
      });

      throw new HttpsError('internal', '予測の計算中にエラーが発生しました');
    }
  }
);