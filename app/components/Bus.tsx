import React, { useState, useEffect, useCallback } from 'react'; // useCallback をインポート
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase'; // src/firebase.ts から functions をインポート
import { type User } from 'firebase/auth'; // User型をインポート

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

interface fetchBusTimeResponseData {
  status: 'success' | 'error';
  message: string;
  busTimeData?: BusTimeData; // 成功時にバス時刻データを含める
  errorCode?: string; // エラー時にエラーコードを含める (HttpsErrorのcodeに対応)
}

interface BusTimetableProps {
  user: User | null; // App.tsx から user を受け取ることを明確に型定義
}

const Bus: React.FC<BusTimetableProps> = ({ user }) => {
  const [toMitakaTimes, setToMitakaTimes] = useState<BusTimeData>([]);
  const [toChofuTimes, setToChofuTimes] = useState<BusTimeData>([]);
  const [loading, setLoading] = useState<boolean>(true); // 初期ローディング状態を追加
  const [error, setError] = useState<string | null>(null);

  // httpsCallable をコンポーネントの外部または memoized して定義
  // これにより、コンポーネントが再レンダリングされても新しい関数インスタンスが生成されない
  const fetchBusTimeCallable = useCallback(
    httpsCallable<{ dept: string; dest: string }, fetchBusTimeResponseData>(functions, 'fetchBusTimeFunction'),
    [] // 依存配列が空なので、一度だけ作成される
  );

  // 三鷹駅行きのバス時刻を取得するエフェクト
  useEffect(() => {
    const fetchMitakaBusTimes = async () => {
      if (!user) {
        setLoading(false); // ログインしていない場合はローディング終了
        setError('ログインしてバス時刻を取得してください。');
        return;
      }

      setLoading(true); // 取得開始時にローディングをtrueに
      setError(null);    // エラーをリセット
      try {
        console.log('Calling fetchBusTime for Mitaka with user:', user.displayName || user.email);
        const result = await fetchBusTimeCallable({ dept: '山野', dest: '三鷹駅' });
        // 結果のデータが期待する型であることを確認し、ステートを更新
        const busTimeData: BusTimeData = result.data?.busTimeData || [];
        console.log("三鷹", busTimeData);
        setToMitakaTimes(busTimeData);
      } catch (err: unknown) {
        let errorMessage = "不明なエラーが発生しました。";
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        console.error("Error fetching Mitaka bus times:", err);
        setError(`三鷹駅行き時刻の取得に失敗しました: ${errorMessage}`);
        setToMitakaTimes([]);
      } finally {
        setLoading(false); // 取得終了時にローディングをfalseに
      }
    };

    fetchMitakaBusTimes();
  }, [user, fetchBusTimeCallable]); // user または fetchBusTimeCallable が変更されたら再実行

  // 調布駅行きのバス時刻を取得するエフェクト
  useEffect(() => {
    const fetchChofuBusTimes = async () => {
      if (!user) {
        // Auth useEffectが実行され、userがnullの場合、
        // このエフェクトは実行されないか、すぐにreturnする
        return;
      }

      setLoading(true); // 取得開始時にローディングをtrueに
      setError(null);    // エラーをリセット
      try {
        console.log('Calling fetchBusTime for Chofu with user:', user.displayName || user.email);
        const result = await fetchBusTimeCallable({ dept: '山野', dest: '富士見町住宅前' });
        const busTimeData: BusTimeData = result.data?.busTimeData || [];
        console.log("富士見町住宅前", busTimeData);
        setToChofuTimes(busTimeData);
      } catch (err: unknown) {
        let errorMessage = "不明なエラーが発生しました。";
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        console.error("Error fetching Chofu bus times:", err);
        setError(`調布駅行き時刻の取得に失敗しました: ${errorMessage}`);
        setToChofuTimes([]);
      } finally {
        setLoading(false); // 取得終了時にローディングをfalseに
      }
    };

    fetchChofuBusTimes();
  }, [user, fetchBusTimeCallable]); // user または fetchBusTimeCallable が変更されたら再実行


  // レンダリング部分
  if (loading) {
    return <p>バス時刻を読み込み中...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>エラー: {error}</p>;
  }
  console.log("toMitakaTimes", toMitakaTimes);
  console.log("toChofuTimes", toChofuTimes);
  // データ表示部分
  return (
    <div>
      <h2>山野 発車時刻</h2>
      <div>
        <h3>三鷹駅行き</h3>
        <ul>
          {toMitakaTimes.length > 0 ? (
            toMitakaTimes.map((bus, index) => (
              <li key={`mitaka-${index}`}>
                {index + 1}便: {bus.deptTime}発 {bus.destTime}着
              </li>
            ))
          ) : (
            <li>データがありません。</li>
          )}
        </ul>
      </div>
      <div>
        <h3>富士見町住宅前行き</h3>
        <ul>
          {toChofuTimes.length > 0 ? (
            toChofuTimes.map((bus, index) => (
              <li key={`chofu-${index}`}>
                {index + 1}便: {bus.deptTime}発 {bus.destTime}着
              </li>
            ))
          ) : (
            <li>データがありません。</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Bus;
