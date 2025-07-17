import React, { useState, useEffect } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { ja } from 'date-fns/locale'; // 日本語ロケール
import { MdSchedule, MdWaterDrop, MdDataUsage, MdDateRange, MdNotifications } from 'react-icons/md';
import { GiBabyBottle } from 'react-icons/gi';
import type { PredictMilkData } from '../types/prediction';

// Firebase TimestampオブジェクトからDateオブジェクトに変換するヘルパー関数
const convertFirebaseTimestampToDate = (timestamp: { _seconds: number; _nanoseconds: number }): Date => {
  return new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1_000_000);
};

interface MilkPredictionCardProps {
  prediction: PredictMilkData | null;
  loading: boolean;
  error: string | null;
}

/**
 * ミルク予測表示コンポーネント
 * 要件1.1, 2.1, 2.3, 3.3, 5.1, 5.2に対応
 */
const MilkPredictionCard: React.FC<MilkPredictionCardProps> = ({ prediction, loading, error }) => {
  // 30分以内の予測かどうかの状態を管理
  const [isNearPrediction, setIsNearPrediction] = useState<boolean>(false);
  // 残り分数を管理
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);

  // 予測時刻が近づいているかどうかを定期的にチェック
  useEffect(() => {
    if (!prediction) return;

    const nextFeedingDate = convertFirebaseTimestampToDate(prediction.nextFeedingTime);

    // 初期チェック
    const checkTimeProximity = () => {
      const now = new Date();
      const diffMinutes = differenceInMinutes(nextFeedingDate, now);
      const isNear = diffMinutes >= 0 && diffMinutes <= 30;

      setIsNearPrediction(isNear);
      setRemainingMinutes(diffMinutes >= 0 ? diffMinutes : null);
    };

    // 初回実行
    checkTimeProximity();

    // 1分*10ごとに更新
    const intervalId = setInterval(checkTimeProximity, 60000 * 10);

    // クリーンアップ
    return () => clearInterval(intervalId);
  }, [prediction]);

  // ローディング状態の表示
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 w-full animate-pulse">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-200 rounded-full mr-3"></div>
            <div className="h-6 bg-gray-300 rounded w-32"></div>
          </div>
          <div className="h-6 bg-green-100 rounded-full w-16"></div>
        </div>
        <div className="h-5 bg-gray-300 rounded w-3/4 mb-4"></div>
        <div className="h-5 bg-gray-300 rounded w-2/3 mb-4"></div>
        <div className="h-5 bg-gray-300 rounded w-1/2 mb-4"></div>
        <div className="h-5 bg-gray-300 rounded w-3/4"></div>
      </div>
    );
  }

  // エラー状態の表示
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative w-full" role="alert">
        <strong className="font-bold">エラー！</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  // データがない場合の表示
  if (!prediction) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 w-full text-gray-600">
        <h2 className="text-xl font-bold mb-4 text-gray-800">授乳予測</h2>
        <p>予測データがありません。十分な授乳記録がない可能性があります。</p>
      </div>
    );
  }

  // 予測時刻をDateオブジェクトに変換
  const nextFeedingDate = convertFirebaseTimestampToDate(prediction.nextFeedingTime);

  // データ範囲の日時をDateオブジェクトに変換
  const dataRangeFrom = convertFirebaseTimestampToDate(prediction.dataRange.from);
  const dataRangeTo = convertFirebaseTimestampToDate(prediction.dataRange.to);

  // 信頼度レベルに基づいて表示色を決定
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.7) return 'text-green-600';
    if (confidence >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 信頼度レベルに基づいて表示テキストを決定
  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 0.7) return '高';
    if (confidence >= 0.4) return '中';
    return '低';
  };

  return (
    <div className={`bg-white rounded-lg shadow-xl p-5 w-full border-l-4 
      ${isNearPrediction ? 'border-green-500' : 'border-green-200'}
      ${isNearPrediction ? 'transition-all duration-500' : ''}
      ${isNearPrediction && remainingMinutes && remainingMinutes <= 15 ? 'animate-pulse' : ''}
    `}>
      {/* カードヘッダー */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
        <div className="flex items-center">
          <GiBabyBottle className={`text-4xl mr-3 ${isNearPrediction ? 'text-green-600' : 'text-green-500'}`} />
          <h2 className="text-2xl font-extrabold text-gray-900">授乳予測</h2>
        </div>
        <div className="flex items-center">
          {isNearPrediction && (
            <div className="mr-2 flex items-center">
              <MdNotifications className="text-xl text-green-600 animate-bounce mr-1" />
              <span className="text-xs font-bold text-green-600">もうすぐ</span>
            </div>
          )}
          <span className="text-sm font-medium px-3 py-1 rounded-full text-green-500 bg-green-50">
            予測
          </span>
        </div>
      </div>

      {/* 予測時刻 */}
      <div className="mb-4 text-gray-700">
        <div className="flex flex-wrap items-center">
          <MdSchedule className={`text-xl mr-3 ${isNearPrediction ? 'text-green-500' : 'text-gray-500'}`} />
          <span className="font-semibold">次回予測時刻:</span>
          <span className={`ml-2 flex-grow text-md leading-relaxed ${isNearPrediction ? 'font-bold text-green-700' : 'text-gray-800'}`}>
            {format(nextFeedingDate, 'M月d日(E) HH:mm', { locale: ja })}
            {isNearPrediction && (
              <span className="ml-2 text-sm text-green-600 font-bold">
                {remainingMinutes !== null && remainingMinutes <= 15
                  ? `（あと${remainingMinutes}分）`
                  : '（もうすぐ）'}
              </span>
            )}
          </span>
        </div>

        {/* 30分以内の場合は残り時間のプログレスバーを表示 */}
        {isNearPrediction && remainingMinutes !== null && (
          <div className="mt-2 w-full">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${remainingMinutes <= 5 ? 'bg-red-500' :
                  remainingMinutes <= 15 ? 'bg-yellow-500' : 'bg-green-500'
                  } transition-all duration-500`}
                style={{ width: `${((30 - remainingMinutes) / 30) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>残り{remainingMinutes}分</span>
              <span>30分</span>
            </div>
          </div>
        )}
      </div>

      {/* 予測量 */}
      <div className="flex flex-wrap items-center mb-4 text-gray-700">
        <MdWaterDrop className="text-xl text-blue-500 mr-3" />
        <span className="font-semibold">予測量:</span>
        <span className="ml-2 flex-grow text-md text-gray-800 leading-relaxed">
          {prediction.predictedQuantity.range
            ? `${prediction.predictedQuantity.range.min}〜${prediction.predictedQuantity.range.max}${prediction.predictedQuantity.unit}`
            : `${prediction.predictedQuantity.amount}${prediction.predictedQuantity.unit}`
          }
        </span>
      </div>

      {/* 信頼度 */}
      <div className="flex flex-wrap items-center mb-4 text-gray-700">
        <MdDataUsage className={`text-xl mr-3 ${getConfidenceColor(prediction.confidence)}`} />
        <span className="font-semibold">信頼度:</span>
        <div className="ml-2 flex items-center flex-wrap">
          <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
            <div
              className={`h-2.5 rounded-full ${prediction.confidence >= 0.7 ? 'bg-green-600' :
                prediction.confidence >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              style={{ width: `${prediction.confidence * 100}%` }}
            ></div>
          </div>
          <span className={`text-sm ${getConfidenceColor(prediction.confidence)}`}>
            {Math.round(prediction.confidence * 100)}% ({getConfidenceText(prediction.confidence)})
          </span>
        </div>
      </div>

      {/* データ範囲 */}
      <div className="flex flex-wrap items-start mb-2 text-gray-700">
        <MdDateRange className="text-xl text-gray-500 mr-3 mt-1" />
        <div className="flex-grow">
          <span className="font-semibold">データ範囲:</span>
          <div className="ml-2 text-sm text-gray-600">
            <div className="md:flex md:flex-wrap">
              <span className="md:mr-2">{format(dataRangeFrom, 'M月d日(E) HH:mm', { locale: ja })} 〜</span>
              <span>{format(dataRangeTo, 'M月d日(E) HH:mm', { locale: ja })}</span>
            </div>
            <div className="mt-1">（{prediction.dataRange.eventCount}件のデータに基づく予測）</div>
          </div>
        </div>
      </div>

      {/* 信頼度が低い場合の免責事項 */}
      {prediction.confidence < 0.4 && (
        <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded-md text-xs text-red-700">
          <p>※ 予測の信頼度が低いため、実際の授乳時間と異なる可能性があります。より正確な予測のためには、継続的な授乳記録をお願いします。</p>
        </div>
      )}
    </div>
  );
};

export default MilkPredictionCard;