# 設計書

## 概要

次回授乳予測機能は、Firestoreに保存された過去の授乳データ（ミルクと母乳）を分析し、統計的手法を用いて次回の授乳時刻と量を予測するシステムです。Firebase Functionsでバックエンド処理を行い、既存のReactフックパターンを使用してフロントエンドに統合します。

## アーキテクチャ

### システム構成
```
React Frontend (usePredictMilk hook)
    ↓ HTTPS Callable
Firebase Functions (predictMilkFunction)
    ↓ Query
Firestore (babyEvents collection)
```

### データフロー
1. フロントエンドがusePredictMilkフックを通じてpredictMilkFunctionを呼び出し
2. Firebase FunctionがFirestoreから過去7日間の授乳データを取得
3. 統計的分析により次回授乳の時刻と量を計算
4. 予測結果をフロントエンドに返却
5. UIコンポーネントで予測情報を表示

## コンポーネントとインターフェース

### Firebase Function: predictMilkFunction

**入力パラメータ:**
```typescript
interface PredictMilkRequest {
  // 現在時刻ベースで予測するため、入力パラメータは不要
}
```

**出力レスポンス:**
```typescript
interface PredictMilkResponse {
  status: 'success' | 'error';
  message: string;
  data: {
    nextFeedingTime: admin.firestore.Timestamp;
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
      from: admin.firestore.Timestamp;
      to: admin.firestore.Timestamp;
      eventCount: number;
    };
    isPrediction: true;
  };
}
```

### React Hook: usePredictMilk

**既存のusePredictMilk.tsを拡張:**
```typescript
interface PredictMilkData {
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
  confidence: number;
  dataRange: {
    from: { _seconds: number; _nanoseconds: number; };
    to: { _seconds: number; _nanoseconds: number; };
    eventCount: number;
  };
  isPrediction: true;
}
```

### UI表示コンポーネント

既存のBabyEventCardコンポーネントを拡張または新規作成:
```typescript
interface MilkPredictionCardProps {
  prediction: PredictMilkData | null;
  loading: boolean;
  error: string | null;
}
```

## データモデル

### Firestoreクエリ対象

**babyEventsコレクション:**
- `event`: "ミルク" または "母乳"
- `timestamp`: 授乳時刻
- `note`: 量の情報（例: "60ml", "左5分/右5分"）

**クエリ条件:**
```typescript
// 過去7日間のミルクと母乳データを取得
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const query = db.collection('babyEvents')
  .where('event', 'in', ['ミルク', '母乳'])
  .where('timestamp', '>=', sevenDaysAgo)
  .orderBy('timestamp', 'desc');
```

### 予測アルゴリズム

**時刻予測:**
1. 過去7日間の授乳間隔を計算
2. 8時間以上の間隔（睡眠時間）を外れ値として除外
3. 残りの間隔の平均値を算出
4. 最後の授乳時刻 + 平均間隔 = 次回予測時刻

**量予測:**
1. noteフィールドから数値を抽出（正規表現: `/(\d+)ml/`）
2. 母乳の場合は標準的な量（50ml）を仮定
3. 過去7日間の平均量を計算
4. 標準偏差が大きい場合は範囲表示

**信頼度計算:**
```typescript
const confidence = Math.min(
  (eventCount / 14) * 0.7 + // データ量による信頼度（最大0.7）
  (1 - (standardDeviation / averageInterval)) * 0.3, // 一貫性による信頼度（最大0.3）
  1.0
);
```

## エラーハンドリング

### Firebase Function側
- 認証エラー: `unauthenticated`
- データ不足エラー: `failed-precondition`
- 計算エラー: `internal`

### フロントエンド側
- ネットワークエラー: 再試行機能
- データ不足: 適切なメッセージ表示
- 計算失敗: フォールバック表示

## テスト戦略

### 単体テスト
1. **予測アルゴリズムのテスト**
   - 正常なデータでの時刻・量予測
   - 外れ値除外の動作確認
   - エッジケース（データ不足、異常値）

2. **Firebase Functionのテスト**
   - 認証チェック
   - Firestoreクエリの正確性
   - レスポンス形式の検証

3. **Reactフックのテスト**
   - ローディング状態の管理
   - エラーハンドリング
   - データ変換の正確性

### 統合テスト
1. **エンドツーエンドフロー**
   - フロントエンドからFirebase Functionまでの完全なフロー
   - 実際のFirestoreデータを使用した予測精度の検証

### テストデータ
```typescript
// テスト用のサンプルデータ
const mockBabyEvents = [
  { event: 'ミルク', note: '60ml', timestamp: '2025-07-15T09:00:00Z' },
  { event: '母乳', note: '左5分/右5分', timestamp: '2025-07-15T12:00:00Z' },
  { event: 'ミルク', note: '50ml', timestamp: '2025-07-15T15:00:00Z' },
  // ... 7日間分のデータ
];
```

## パフォーマンス考慮事項

### Firebase Function最適化
- Firestoreクエリの効率化（インデックス活用）
- 計算結果のキャッシュ（短時間）
- 不要なデータ取得の回避

### フロントエンド最適化
- 予測データの適切なキャッシュ
- 不要な再計算の防止
- ローディング状態の最適化

## セキュリティ

### 認証・認可
- Firebase Authenticationによるユーザー認証必須
- ユーザー固有データへのアクセス制限

### データ保護
- 個人の授乳データの適切な取り扱い
- 予測結果の一時的な保存のみ