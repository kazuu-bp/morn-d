//import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// 予測リクエストの型定義

export interface PredictMilkRequest {
  // 現在時刻ベースで予測するため、入力パラメータは不要
}

// 予測レスポンスの型定義
export interface PredictMilkResponse {
  status: 'success' | 'error';
  message: string;
  data: PredictMilkData;
}

// 予測データの型定義
export interface PredictMilkData {
  nextFeedingTime: Timestamp;
  predictedQuantity: {
    amount: number;
    unit: 'ml';
    range?: {
      min: number;
      max: number;
    };
  };
  confidence: number; // 0-1の信頼度
  dataRange: {
    from: Timestamp;
    to: Timestamp;
    eventCount: number;
  };
  isPrediction: true;
  averageInterval: {
    hours: number;
    mins: number;
  };
}

// エラーレスポンスの型定義
export interface PredictMilkErrorResponse {
  status: 'error';
  message: string;
  error?: string;
}