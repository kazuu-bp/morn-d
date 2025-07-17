import React from 'react';
import BabyEventCard from '../components/BabyEventCard';
import MilkPredictionCard from '../components/MilkPredictionCard';
import { usePredictMilk } from '../hooks/usePredictMilk';
import { GiBabyBottle } from 'react-icons/gi';
import { FaPoop } from 'react-icons/fa';
import { FaPersonBreastfeeding } from "react-icons/fa6";

const ICONMAP = {
  "ミルク": GiBabyBottle,
  "うんち": FaPoop,
  "母乳": FaPersonBreastfeeding
}

const BabyPage: React.FC = () => {
  // ミルク予測データを取得
  const { data: predictionData, loading: predictionLoading, error: predictionError } = usePredictMilk();

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">赤ちゃんの記録</h1>

      {/* ダッシュボードレイアウト - レスポンシブグリッド */}
      <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-4 max-w-[1200px] mx-auto">
        {/* 予測カード - 最初の位置に配置して強調表示 */}
        <div className="lg:col-span-3 md:col-span-2">
          <MilkPredictionCard
            prediction={predictionData}
            loading={predictionLoading}
            error={predictionError}
          />
        </div>

        {/* 実績カード */}
        <BabyEventCard
          title="ミルク"
          eventName="ミルク"
          iconMap={ICONMAP}
        />
        <BabyEventCard
          title="母乳"
          eventName="母乳"
          iconMap={ICONMAP}
        />
        <BabyEventCard
          title="うんち"
          eventName="うんち"
          iconMap={ICONMAP}
        />
      </div>
    </div>
  );
};

export default BabyPage;