import React, { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { type User } from 'firebase/auth';
import {
  type BusTimetableProps,
  type BusTimeData,
  type fetchBusTimeResponseData,
  type fetchBusTimeRequestData
} from 'morn-d/bus';
import { PiArrowFatRightFill } from 'react-icons/pi';



const BusCard: React.FC<BusTimetableProps> = (props) => {
  const [busTimes, setBusTimes] = useState<BusTimeData>([]);
  const [loading, setLoading] = useState<boolean>(true); // 初期ローディング状態を追加
  const [error, setError] = useState<string | null>(null);

  // httpsCallable をコンポーネントの外部または memoized して定義
  // これにより、コンポーネントが再レンダリングされても新しい関数インスタンスが生成されない
  const fetchBusTimeCallable = useCallback(
    httpsCallable<fetchBusTimeRequestData, fetchBusTimeResponseData>(functions, 'fetchBusTimeFunction'),
    [] // 依存配列が空なので、一度だけ作成される
  );
  const user: User = props.user;
  const dept: string = props.fetchBusTimeRequestData.dept;
  const dest: string = props.fetchBusTimeRequestData.dest;

  useEffect(() => {
    const fetchBusTimes = async () => {
      if (!user) {
        setLoading(false); // ログインしていない場合はローディング終了
        setError('ログインしてバス時刻を取得してください。');
        return;
      }

      setLoading(true); // 取得開始時にローディングをtrueに
      setError(null);    // エラーをリセット
      try {
        console.log('Calling fetchBusTime with user:', user.displayName || user.email);
        const result = await fetchBusTimeCallable({
          dept: dept,
          dest: dest
        });
        // 結果のデータが期待する型であることを確認し、ステートを更新
        const busTimeData: BusTimeData = result.data?.busTimeData || [];
        console.log(dest, busTimeData);
        setBusTimes(busTimeData);
      } catch (err: unknown) {
        let errorMessage = "不明なエラーが発生しました。";
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        console.error(dept, " -> ", dest, ", Error fetching bus times: ", err);
        setError(`${dest}行き時刻の取得に失敗しました: ${errorMessage}`);
        setBusTimes([]);
      } finally {
        setLoading(false); // 取得終了時にローディングをfalseに
      }
    };
    fetchBusTimes();
  }, [user, fetchBusTimeCallable]); // user または fetchBusTimeCallable が変更されたら再実行

  // レンダリング部分
  if (loading) {
    return <p>バス時刻を読み込み中...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>エラー: {error}</p>;
  }

  return (
    <div className='p-2'>
      <div className='flex justify-center items-center text-2xl'>
        {dept}  <PiArrowFatRightFill />{dest}
      </div>
      <ul className='list-disc list-inside text-center text-lg'>
        {busTimes.length > 0 ? (
          busTimes.map((bus, index) => (
            <li key={`${dest}-${index}`}>
              {index + 1}便: {bus.deptTime}発 {bus.destTime}着
            </li>
          ))
        ) : (
          <li>データがありません。</li>
        )}
      </ul>
    </div>
  );
};

export default BusCard;
