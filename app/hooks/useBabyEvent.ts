import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';


// イベントデータの型定義 (Firestoreのドキュメント構造に合わせる)
interface BabyEventData {
  id: string;
  event: string;
  note: string;
  timestamp: {
    _seconds: number;
    _nanoseconds: number;
  };
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
}

interface UseBabyEventResult {
  data: BabyEventData | null;
  loading: boolean;
  error: string | null;
  fetchEvent: (eventName: string, limit?: number) => Promise<void>; // limitをオプションに
}

export const useBabyEvent = (): UseBabyEventResult => {
  const [data, setData] = useState<BabyEventData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  //const functions = getFunctions(getApp(), 'asia-northeast1'); // お使いのFunctionsリージョンに合わせて変更してください
  const getBabyEventsCallable = httpsCallable<
    { eventName: string; limit?: number }, // Functionsへの入力型
    { status: string; message: string; data: BabyEventData[]; count: number } // Functionsからの出力型
  >(functions, 'fetchBabyEventsFunction');

  const fetchEvent = useCallback(async (eventName: string, limit: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBabyEventsCallable({ eventName, limit });
      if (result.data.status === 'success' && result.data.data.length > 0) {
        setData(result.data.data[0]); // limit=1なので最初の要素を取得
      } else {
        setData(null);
        setError(`イベント '${eventName}' のデータが見つかりませんでした。`);
      }
    } catch (err: unknown) {
      console.error('Firebase Functions呼び出しエラー:', err);
      const errorMessage = err instanceof Error ? err.message : 'データの取得に失敗しました。';
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchEvent };
};