import { useState, useEffect, useCallback, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { functions, db } from '../firebase';
import type { PredictMilkData, PredictMilkRequest, PredictMilkResponse, PredictMilkErrorResponse, UsePredictMilkResult } from '../types';

/**
 * ミルク予測データを取得するためのカスタムフック
 * 要件1.1, 1.4, 3.1, 3.3に対応
 * 
 * @returns {UsePredictMilkResult} 予測データ、ローディング状態、エラー情報、最終更新時刻、再取得関数
 */
export const usePredictMilk = (): UsePredictMilkResult => {
  const [data, setData] = useState<PredictMilkData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);

  // 自動更新のためのタイマー参照
  const autoUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Firestoreリスナーの参照を保持
  const firestoreUnsubscribeRef = useRef<(() => void) | null>(null);

  // 最後に検出したイベントのタイムスタンプを保持
  const lastEventTimestampRef = useRef<number | null>(null);

  // 予測用のFirebase Functions呼び出し
  const predictMilkCallable = httpsCallable<
    PredictMilkRequest, // 入力は空（現在時刻ベースで予測）
    PredictMilkResponse | PredictMilkErrorResponse // 予測結果またはエラー
  >(functions, 'predictMilkFunction');

  /**
   * 予測データを取得する関数
   * エラーハンドリングを改善し、より詳細なエラーメッセージを提供
   */
  const fetchPrediction = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const result = await predictMilkCallable({});

      if (result.data.status === 'success') {
        setData(result.data.data);
        setLastUpdated(new Date());
      } else {
        setData(null);
        // より詳細なエラーメッセージを設定
        const errorResponse = result.data as PredictMilkErrorResponse;
        setError(errorResponse.message || '予測データの取得に失敗しました。');
      }
    } catch (err: unknown) {
      console.error('予測データ取得エラー:', err);

      // FirebaseErrorの場合は詳細なエラー情報を提供
      if (err instanceof FirebaseError) {
        const errorMessage = `エラー (${err.code}): ${err.message}`;
        setError(errorMessage);
      } else {
        const errorMessage = err instanceof Error ? err.message : '予測データの取得に失敗しました。';
        setError(errorMessage);
      }

      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回レンダリング時に予測データを取得
  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  // 新しい授乳データが追加された時に予測を再計算するためのFirestoreリスナー
  useEffect(() => {
    // Firestoreから授乳データ（ミルクと母乳）を監視
    const setupFirestoreListener = () => {
      // 既存のリスナーをクリア
      if (firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
        firestoreUnsubscribeRef.current = null;
      }

      // 過去1時間以内の授乳イベントを監視（パフォーマンスのため時間範囲を制限）
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const firestoreTimestamp = Timestamp.fromDate(oneHourAgo);

      // ミルクと母乳のイベントを監視するクエリ
      const babyEventsQuery = query(
        collection(db, 'babyEvents'),
        where('event', 'in', ['ミルク', '母乳']),
        where('timestamp', '>=', firestoreTimestamp),
        orderBy('timestamp', 'desc'),
        limit(10) // パフォーマンスのため最新10件に制限
      );

      // リスナーを設定
      const unsubscribe = onSnapshot(
        babyEventsQuery,
        (snapshot) => {
          // 変更があった場合のみ処理
          if (!snapshot.empty) {
            // 最新のドキュメントを取得
            const latestDoc = snapshot.docs[0];
            const latestTimestamp = latestDoc.data().timestamp;

            // タイムスタンプをミリ秒に変換
            const latestTimeMs = latestTimestamp.seconds * 1000 + latestTimestamp.nanoseconds / 1000000;

            // 前回検出したイベントより新しい場合、または初回の場合
            if (!lastEventTimestampRef.current || latestTimeMs > lastEventTimestampRef.current) {
              // 最新のタイムスタンプを保存
              lastEventTimestampRef.current = latestTimeMs;

              console.log('新しい授乳イベントを検出しました。予測を更新します。', new Date(latestTimeMs));

              // 少し遅延を入れて予測を更新（複数の更新が連続して発生するのを防ぐ）
              setTimeout(() => {
                fetchPrediction();
              }, 2000);
            }
          }
        },
        (error) => {
          console.error('授乳イベント監視エラー:', error);
        }
      );

      // クリーンアップ用にリスナーの解除関数を保存
      firestoreUnsubscribeRef.current = unsubscribe;
    };

    // Firestoreリスナーをセットアップ
    setupFirestoreListener();

    // コンポーネントのアンマウント時にリスナーを解除
    return () => {
      if (firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
        firestoreUnsubscribeRef.current = null;
      }
    };
  }, [fetchPrediction]);

  // 予測時刻に基づいて自動更新をスケジュール
  useEffect(() => {
    // 既存のタイマーをクリア
    if (autoUpdateTimerRef.current) {
      clearTimeout(autoUpdateTimerRef.current);
      autoUpdateTimerRef.current = null;
    }

    // データがない場合は何もしない
    if (!data || !data.nextFeedingTime) return;

    // 予測時刻をDateオブジェクトに変換
    const nextFeedingDate = new Date(
      data.nextFeedingTime._seconds * 1000 +
      data.nextFeedingTime._nanoseconds / 1_000_000
    );

    const now = new Date();
    const diffMs = nextFeedingDate.getTime() - now.getTime();

    // 更新間隔の設定（要件3.1に対応）
    const scheduleUpdate = (delayMs: number, reason: string) => {
      console.log(`予測更新をスケジュール: ${reason}, ${Math.round(delayMs / 1000 / 60)}分後`);
      autoUpdateTimerRef.current = setTimeout(() => {
        console.log(`予測を更新します: ${reason}`);
        fetchPrediction();
      }, delayMs);
    };

    // 予測時刻が過ぎている場合は10分更新（要件1.4に対応）
    if (diffMs < 0) {
      // 少し遅延を入れて更新
      scheduleUpdate(1000 * 60 * 10, '予測時刻経過');
      return;
    }

    // 予測時刻まで30分以内の場合は、より頻繁に更新（要件3.2に対応）
    if (diffMs <= 30 * 60 * 1000) {
      // 予測時刻が近い場合は、より短い間隔で更新
      if (diffMs <= 5 * 60 * 1000) {
        // 5分以内: 予測時刻の直後に更新
        scheduleUpdate(diffMs + (1 * 60 * 1000), '予測時刻直後（5分以内）');
      } else if (diffMs <= 15 * 60 * 1000) {
        // 15分以内: 5分後に更新
        scheduleUpdate(5 * 60 * 1000, '5分後に更新（15分以内）');
      } else {
        // 30分以内: 10分後に更新
        scheduleUpdate(10 * 60 * 1000, '10分後に更新（30分以内）');
      }
      return;
    }

    // 予測時刻まで1時間以内の場合は、30分前になったタイミングで更新
    if (diffMs <= 60 * 60 * 1000) {
      const updateDelayMs = diffMs - (30 * 60 * 1000);
      if (updateDelayMs > 0) {
        scheduleUpdate(updateDelayMs, '30分前に更新');
        return;
      }
    }

    // それ以外の場合は、定期的に更新（1時間ごと）
    scheduleUpdate(60 * 60 * 1000, '定期更新（1時間ごと）');

    // クリーンアップ関数
    return () => {
      if (autoUpdateTimerRef.current) {
        clearTimeout(autoUpdateTimerRef.current);
        autoUpdateTimerRef.current = null;
      }
    };
  }, [data, fetchPrediction]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch: fetchPrediction
  };
};