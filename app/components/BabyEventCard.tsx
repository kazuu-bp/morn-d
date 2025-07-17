import React, { useEffect, useRef } from 'react';
import { useBabyEvent } from '../hooks/useBabyEvent';
import { usePredictMilk } from '../hooks/usePredictMilk';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale'; // 日本語ロケール

import { GiKidneys } from 'react-icons/gi';
import { MdAccessTimeFilled, MdEditNote, MdSchedule } from 'react-icons/md';

// Firebase TimestampオブジェクトからDateオブジェクトに変換するヘルパー関数
const convertFirebaseTimestampToDate = (timestamp: { _seconds: number; _nanoseconds: number }): Date => {
  return new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1_000_000);
};

interface BabyEventCardProps {
  title: string;
  eventName: string;
  iconMap: { [key: string]: React.ElementType }; // イベント名とアイコンのマッピング
  predict?: boolean;
}

const BabyEventCard: React.FC<BabyEventCardProps> = ({ title, eventName, iconMap, predict }) => {
  // 両方のhookを呼び出し
  const { data: eventData, loading: eventLoading, error: eventError, fetchEvent } = useBabyEvent();
  const { data: predictData, loading: predictLoading, error: predictError } = usePredictMilk();

  // データとローディング状態を統合
  const data = predict ? predictData : eventData;
  const loading = predict ? predictLoading : eventLoading;
  const error = predict ? predictError : eventError;

  // 前回のeventNameを記録して、不要な再実行を防ぐ
  const prevEventNameRef = useRef<string>('');

  useEffect(() => {
    // predictがfalseで、eventNameが変更された場合のみfetchEventを呼び出す
    if (!predict && prevEventNameRef.current !== eventName) {
      prevEventNameRef.current = eventName;
      fetchEvent(eventName, 1); // limitは1を指定
    }
  }, [predict, eventName, fetchEvent]);

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

  // データ型に応じて適切なタイムスタンプを取得
  const timestampDate = !predict && 'timestamp' in data && data.timestamp
    ? convertFirebaseTimestampToDate(data.timestamp)
    : null;

  // 予測データの場合は nextFeedingTime を取得
  const predictedDate = predict && 'nextFeedingTime' in data && data.nextFeedingTime
    ? convertFirebaseTimestampToDate(data.nextFeedingTime)
    : null;

  // アイコンの選択
  const EventIcon = iconMap[eventName] || GiKidneys; // デフォルトアイコン
  return (
    <div className="bg-white rounded-lg shadow-xl p-4 m-4 w-96 flex flex-col justify-between">
      <div>
        {/* カードタイトルと主要アイコン */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
          <div className="flex items-center">
            <EventIcon className={`text-4xl mr-3 ${predict ? 'text-green-600' : 'text-blue-600'}`} />
            <h2 className="text-2xl font-extrabold text-gray-900">{title}</h2>
          </div>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${predict
            ? 'text-green-500 bg-green-50'
            : 'text-blue-500 bg-blue-50'
            }`}>
            {predict ? '予測' : '最新'}
          </span>
        </div>
      </div>
      {/* ノート */}
      {'note' in data && data.note && (
        <div className="flex items-center mb-3 text-gray-700">
          <MdEditNote className="text-xl text-gray-500 mr-3 mt-1" />
          <span className="font-semibold">メモ:</span>
          <span className="ml-2 flex-grow text-md text-gray-800 leading-relaxed">{data.note}</span>
        </div>
      )}

      {/* 予測データの場合は予測時刻を表示 */}
      {predict && predictedDate && (
        <div className="flex items-center mb-3 text-gray-700">
          <MdSchedule className="text-xl text-green-500 mr-3 mt-1" />
          <span className="font-semibold">予測時刻:</span>
          <span className="ml-2 flex-grow text-md text-gray-800 leading-relaxed">
            {format(predictedDate, 'M月d日 HH:mm', { locale: ja })}
          </span>
        </div>
      )}

      {/* 通常データの場合は記録日時を表示 */}
      {!predict && timestampDate && (
        <div className="flex items-center mb-3 text-gray-700">
          <MdAccessTimeFilled className="text-xl text-gray-500 mr-3 mt-1" />
          <span className="font-semibold">記録日時:</span>
          <span className="ml-2 flex-grow text-md text-gray-800 leading-relaxed">
            {format(timestampDate, 'M月d日 HH:mm', { locale: ja })}
          </span>
        </div>
      )}

      {/* 予測データの信頼度表示 */}
      {predict && 'confidence' in data && data.confidence && (
        <div className="flex items-center mb-3 text-gray-700">
          <div className="text-xl text-green-500 mr-3 mt-1">📊</div>
          <span className="font-semibold">信頼度:</span>
          <span className="ml-2 flex-grow text-md text-gray-800 leading-relaxed">
            {Math.round(data.confidence * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default BabyEventCard;