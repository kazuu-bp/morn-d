import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// BabyEventの基本型定義（Firestore保存用）
export interface BabyEvent {
  event: string;
  timestamp: Timestamp;
  note: string;
  createdAt?: FieldValue;
  updatedAt?: FieldValue;
}

// BabyEventのレコード型定義（取得時用、IDを含む）
export interface BabyEventRecord extends Omit<BabyEvent, 'createdAt' | 'updatedAt'> {
  id: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  [key: string]: unknown; // 他の動的フィールドに対応
}

// 授乳関連のイベントタイプ
export type FeedingEventType = 'ミルク' | '母乳';

// 授乳イベントの型定義
export interface FeedingEvent extends BabyEvent {
  event: FeedingEventType;
}

// 授乳イベントレコードの型定義
export interface FeedingEventRecord extends BabyEventRecord {
  event: FeedingEventType;
}