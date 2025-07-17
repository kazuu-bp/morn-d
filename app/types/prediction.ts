/**
 * フロントエンド用の予測データ型定義
 * Firebase Timestampはシリアライズされた形式で受け取る
 */
export interface PredictMilkData {
  nextFeedingTime: {
    _seconds: number;
    _nanoseconds: number;
  };
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
    from: { _seconds: number; _nanoseconds: number; };
    to: { _seconds: number; _nanoseconds: number; };
    eventCount: number;
  };
  isPrediction: true;
}

/**
 * 予測リクエストの型定義（フロントエンド用）
 * 設計書に基づき、入力パラメータは不要
 */
export interface PredictMilkRequest {
  // 現在時刻ベースで予測するため、入力パラメータは不要
}

/**
 * 予測レスポンスの型定義（フロントエンド用）
 * Firebase Functionsからのレスポンス形式に合わせる
 */
export interface PredictMilkResponse {
  status: 'success' | 'error';
  message: string;
  data: PredictMilkData;
}

/**
 * エラーレスポンスの型定義（フロントエンド用）
 * より詳細なエラー情報を含む
 */
export interface PredictMilkErrorResponse {
  status: 'error';
  message: string;
  error?: string;
  code?: string; // Firebase Functionsのエラーコード
}

/**
 * usePredictMilkフックの戻り値型定義
 * 要件1.1, 1.4, 3.1, 3.3に対応
 */
export interface UsePredictMilkResult {
  data: PredictMilkData | null;
  loading: boolean;
  error: string | null;
  // 最終更新時刻を追加（自動更新機能のため）
  lastUpdated?: Date;
  // 手動で再取得するための関数
  refetch?: () => Promise<void>;
}