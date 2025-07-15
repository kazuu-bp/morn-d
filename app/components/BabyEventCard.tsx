// src/components/BabyEventCard.tsx
import React, { useEffect } from 'react';
import { useBabyEvent } from '../hooks/useBabyEvent'; // パスを適宜調整
import { format } from 'date-fns';
import { ja } from 'date-fns/locale'; // 日本語ロケール

// アイコンのインポート (例: 母乳は哺乳瓶、おむつはオムツアイコンなど)
import { /*GiMilkBottle, GiBabyDiaper,*/ GiKidneys } from 'react-icons/gi';
import { MdAccessTimeFilled, MdEditNote } from 'react-icons/md';
import { FaCalendarAlt } from 'react-icons/fa';

// Firebase TimestampオブジェクトからDateオブジェクトに変換するヘルパー関数
const convertFirebaseTimestampToDate = (timestamp: { _seconds: number; _nanoseconds: number }): Date => {
  return new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1_000_000);
};

interface BabyEventCardProps {
  title: string;
  eventName: string;
  iconMap: { [key: string]: React.ElementType }; // イベント名とアイコンのマッピング
}

const BabyEventCard: React.FC<BabyEventCardProps> = ({ title, eventName, iconMap }) => {
  const { data, loading, error, fetchEvent } = useBabyEvent();

  useEffect(() => {
    // コンポーネントがマウントされたらデータを取得
    fetchEvent(eventName, 1); // limitは1を指定
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 m-4 w-96 animate-pulse">
        <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
        <div className="flex items-center text-gray-600 mb-2">
          <div className="w-6 h-6 bg-gray-300 rounded-full mr-2"></div>
          <div className="h-4 bg-gray-300 rounded w-2/3"></div>
        </div>
        <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4 w-96" role="alert">
        <strong className="font-bold">エラー！</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 m-4 w-96 text-gray-600">
        <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
        <p>データがありません。</p>
      </div>
    );
  }

  // timestampとcreatedAtをDateオブジェクトに変換
  const timestampDate = data.timestamp ? convertFirebaseTimestampToDate(data.timestamp) : null;
  const createdAtDate = data.createdAt ? convertFirebaseTimestampToDate(data.createdAt) : null;

  // アイコンの選択
  const EventIcon = iconMap[eventName] || GiKidneys; // デフォルトアイコン

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 m-4 w-96 flex flex-col justify-between">
      <div>
        {/* カードタイトルと主要アイコン */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
          <div className="flex items-center">
            <EventIcon className="text-4xl text-blue-600 mr-3" />
            <h2 className="text-2xl font-extrabold text-gray-900">{title}</h2>
          </div>
          <span className="text-sm font-medium text-blue-500 bg-blue-50 px-3 py-1 rounded-full">最新</span>
        </div>

        {/* イベントタイプ */}
        <div className="flex items-center mb-3 text-gray-700">
          <GiKidneys className="text-xl text-gray-500 mr-3" />
          <span className="font-semibold">イベント:</span>
          <span className="ml-2 text-lg font-medium text-purple-700">{data.event}</span>
        </div>

        {/* ノート */}
        {data.note && (
          <div className="flex items-start mb-3 text-gray-700">
            <MdEditNote className="text-xl text-gray-500 mr-3 mt-1" />
            <span className="font-semibold">メモ:</span>
            <span className="ml-2 flex-grow text-md text-gray-800 leading-relaxed">{data.note}</span>
          </div>
        )}
      </div>

      {/* タイムスタンプと作成日時 */}
      <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
        {timestampDate && (
          <div className="flex items-center mb-2">
            <MdAccessTimeFilled className="text-lg text-gray-400 mr-2" />
            <span className="font-medium">記録日時:</span>
            <span className="ml-2 text-gray-700">
              {format(timestampDate, 'yyyy年M月d日 HH:mm', { locale: ja })} (JST)
            </span>
          </div>
        )}
        {createdAtDate && (
          <div className="flex items-center">
            <FaCalendarAlt className="text-lg text-gray-400 mr-2" />
            <span className="font-medium">作成日時:</span>
            <span className="ml-2 text-gray-700">
              {format(createdAtDate, 'yyyy年M月d日 HH:mm:ss', { locale: ja })} (JST)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BabyEventCard;