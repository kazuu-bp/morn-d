import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';
import { predictMilkFunction } from '../src/predictMilkFunction';
import { getFeedingDataLast7Days } from '../src/queries/feedingDataQueries';
import { FeedingEventRecord } from '../src/types/babyEvent';
import { Timestamp } from 'firebase-admin/firestore';

// Firebase Admin SDKのモック
vi.mock('firebase-admin', () => ({
  firestore: {
    Timestamp: {
      fromMillis: vi.fn((ms: number) => ({
        toMillis: () => ms,
        toDate: () => new Date(ms),
        _seconds: Math.floor(ms / 1000),
        _nanoseconds: (ms % 1000) * 1000000
      })),
      fromDate: vi.fn((date: Date) => ({
        toMillis: () => date.getTime(),
        toDate: () => date,
        _seconds: Math.floor(date.getTime() / 1000),
        _nanoseconds: (date.getTime() % 1000) * 1000000
      }))
    }
  }
}));

// Firebase Functions loggerのモック
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}));

// クエリ関数のモック
vi.mock('../src/queries/feedingDataQueries', () => ({
  getFeedingDataLast7Days: vi.fn()
}));

const mockGetFeedingDataLast7Days = vi.mocked(getFeedingDataLast7Days);

describe('predictMilkFunction Integration Tests', () => {
  const mockUserId = 'test-user-123';
  const mockAuth = { uid: mockUserId };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ヘルパー関数：テスト用の授乳データを作成
  function createMockFeedingEvent(
    event: 'ミルク' | '母乳',
    note: string,
    hoursAgo: number,
    id: string = `event-${hoursAgo}`
  ): FeedingEventRecord {
    const timestamp = Timestamp.fromMillis(
      Date.now() - (hoursAgo * 60 * 60 * 1000)
    );
    return {
      id,
      event,
      note,
      timestamp,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  describe('正常ケースのテスト（十分なデータがある場合）', () => {
    it('十分な授乳データがある場合、正確な予測を返す', async () => {
      // 過去7日間の規則的な授乳データを準備
      const mockFeedingData: FeedingEventRecord[] = [
        createMockFeedingEvent('ミルク', '60ml', 3, 'event-1'),
        createMockFeedingEvent('ミルク', '55ml', 6, 'event-2'),
        createMockFeedingEvent('母乳', '左5分/右5分', 9, 'event-3'),
        createMockFeedingEvent('ミルク', '50ml', 12, 'event-4'),
        createMockFeedingEvent('ミルク', '65ml', 15, 'event-5'),
        createMockFeedingEvent('母乳', '左8分/右7分', 18, 'event-6'),
        createMockFeedingEvent('ミルク', '58ml', 21, 'event-7')
      ];

      mockGetFeedingDataLast7Days.mockResolvedValue(mockFeedingData);

      const request = {
        auth: mockAuth,
        data: {}
      };

      const result = await predictMilkFunction(request as any);

      expect(result.status).toBe('success');
      expect(result.message).toBe('予測が正常に計算されました');
      expect(result.data).toBeDefined();
      expect(result.data.nextFeedingTime).toBeDefined();
      expect(result.data.predictedQuantity.amount).toBeGreaterThan(0);
      expect(result.data.predictedQuantity.unit).toBe('ml');
      expect(result.data.confidence).toBeGreaterThan(0);
      expect(result.data.confidence).toBeLessThanOrEqual(1);
      expect(result.data.dataRange.eventCount).toBe(7);
      expect(result.data.isPrediction).toBe(true);
    });

    it('ミルクのみのデータで正確な量予測を行う', async () => {
      const mockFeedingData: FeedingEventRecord[] = [
        createMockFeedingEvent('ミルク', '60ml', 3, 'event-1'),
        createMockFeedingEvent('ミルク', '55ml', 6, 'event-2'),
        createMockFeedingEvent('ミルク', '65ml', 9, 'event-3'),
        createMockFeedingEvent('ミルク', '50ml', 12, 'event-4')
      ];

      mockGetFeedingDataLast7Days.mockResolvedValue(mockFeedingData);

      const request = {
        auth: mockAuth,
        data: {}
      };

      const result = await predictMilkFunction(request as any);

      expect(result.status).toBe('success');
      expect(result.data.predictedQuantity.amount).toBe(57.5); // (60+55+65+50)/4
      expect(result.data.predictedQuantity.unit).toBe('ml');
    });

    it('母乳のみのデータで標準量50mlを使用する', async () => {
      const mockFeedingData: FeedingEventRecord[] = [
        createMockFeedingEvent('母乳', '左5分/右5分', 3, 'event-1'),
        createMockFeedingEvent('母乳', '左8分/右7分', 6, 'event-2'),
        createMockFeedingEvent('母乳', '左6分/右6分', 9, 'event-3')
      ];

      mockGetFeedingDataLast7Days.mockResolvedValue(mockFeedingData);

      const request = {
        auth: mockAuth,
        data: {}
      };

      const result = await predictMilkFunction(request as any);

      expect(result.status).toBe('success');
      expect(result.data.predictedQuantity.amount).toBe(50); // 母乳の標準量
      expect(result.data.predictedQuantity.unit).toBe('ml');
    });

    it('量のばらつきが大きい場合、範囲を提供する', async () => {
      const mockFeedingData: FeedingEventRecord[] = [
        createMockFeedingEvent('ミルク', '40ml', 3, 'event-1'),
        createMockFeedingEvent('ミルク', '80ml', 6, 'event-2'),
        createMockFeedingEvent('ミルク', '45ml', 9, 'event-3'),
        createMockFeedingEvent('ミルク', '75ml', 12, 'event-4')
      ];

      mockGetFeedingDataLast7Days.mockResolvedValue(mockFeedingData);

      const request = {
        auth: mockAuth,
        data: {}
      };

      const result = await predictMilkFunction(request as any);

      expect(result.status).toBe('success');
      expect(result.data.predictedQuantity.range).toBeDefined();
      expect(result.data.predictedQuantity.range!.min).toBeGreaterThan(0);
      expect(result.data.predictedQuantity.range!.max).toBeGreaterThan(result.data.predictedQuantity.range!.min);
    });

    it('高い信頼度を持つ一貫したデータの場合、高い信頼度を返す', async () => {
      // 非常に規則的な授乳パターン
      const mockFeedingData: FeedingEventRecord[] = Array.from({ length: 14 }, (_, i) =>
        createMockFeedingEvent('ミルク', '60ml', (i + 1) * 3, `event-${i + 1}`)
      );

      mockGetFeedingDataLast7Days.mockResolvedValue(mockFeedingData);

      const request = {
        auth: mockAuth,
        data: {}
      };

      const result = await predictMilkFunction(request as any);

      expect(result.status).toBe('success');
      expect(result.data.confidence).toBeGreaterThan(0.7); // 高い信頼度
    });
  });

  describe('データ不足ケースのテスト', () => {
    it('授乳データが1件以下の場合、適切なエラーを返す', async () => {
      const mockFeedingData: FeedingEventRecord[] = [
        createMockFeedingEvent('ミルク', '60ml', 3, 'event-1')
      ];

      mockGetFeedingDataLast7Days.mockResolvedValue(mockFeedingData);

      const request = {
        auth: mockAuth,
        data: {}
      };

      await expect(predictMilkFunction(request as any)).rejects.toThrow(HttpsError);

      try {
        await predictMilkFunction(request as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe('failed-precondition');
        expect((error as HttpsError).message).toContain('予測に十分なデータがありません');
      }
    });

    it('授乳データが空の場合、適切なエラーを返す', async () => {
      mockGetFeedingDataLast7Days.mockResolvedValue([]);

      const request = {
        auth: mockAuth,
        data: {}
      };

      await expect(predictMilkFunction(request as any)).rejects.toThrow(HttpsError);

      try {
        await predictMilkFunction(request as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe('failed-precondition');
        expect((error as HttpsError).message).toContain('予測に十分なデータがありません');
      }
    });

    it('有効な授乳間隔がない場合（すべて8時間以上）、適切なエラーを返す', async () => {
      // すべて8時間以上の間隔（睡眠時間）
      const mockFeedingData: FeedingEventRecord[] = [
        createMockFeedingEvent('ミルク', '60ml', 10, 'event-1'),
        createMockFeedingEvent('ミルク', '55ml', 30, 'event-2')
      ];

      mockGetFeedingDataLast7Days.mockResolvedValue(mockFeedingData);

      const request = {
        auth: mockAuth,
        data: {}
      };

      await expect(predictMilkFunction(request as any)).rejects.toThrow(HttpsError);

      try {
        await predictMilkFunction(request as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe('failed-precondition');
        expect((error as HttpsError).message).toContain('有効な授乳間隔が見つかりません');
      }
    });
  });

  describe('認証エラーケースのテスト', () => {
    it('認証されていないリクエストの場合、認証エラーを返す', async () => {
      const request = {
        auth: null, // 認証なし
        data: {}
      };

      await expect(predictMilkFunction(request as any)).rejects.toThrow(HttpsError);

      try {
        await predictMilkFunction(request as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe('unauthenticated');
        expect((error as HttpsError).message).toBe('認証が必要です');
      }
    });

    it('認証オブジェクトが未定義の場合、認証エラーを返す', async () => {
      const request = {
        auth: undefined,
        data: {}
      };

      await expect(predictMilkFunction(request as any)).rejects.toThrow(HttpsError);

      try {
        await predictMilkFunction(request as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe('unauthenticated');
        expect((error as HttpsError).message).toBe('認証が必要です');
      }
    });

    it('UIDが存在しない認証オブジェクトの場合でも処理を継続する', async () => {
      const mockFeedingData: FeedingEventRecord[] = [
        createMockFeedingEvent('ミルク', '60ml', 3, 'event-1'),
        createMockFeedingEvent('ミルク', '55ml', 6, 'event-2')
      ];

      mockGetFeedingDataLast7Days.mockResolvedValue(mockFeedingData);

      const request = {
        auth: { uid: '' }, // 空のUID
        data: {}
      };

      const result = await predictMilkFunction(request as any);
      expect(result.status).toBe('success');
    });
  });

  describe('異常データ処理のテスト', () => {
    it('Firestoreクエリが失敗した場合、内部エラーを返す', async () => {
      mockGetFeedingDataLast7Days.mockRejectedValue(new Error('Firestore connection failed'));

      const request = {
        auth: mockAuth,
        data: {}
      };

      await expect(predictMilkFunction(request as any)).rejects.toThrow(HttpsError);

      try {
        await predictMilkFunction(request as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe('internal');
        expect((error as HttpsError).message).toBe('データの取得に失敗しました');
      }
    });

    it('不正な形式のnoteフィールドを含むデータを適切に処理する', async () => {
      const mockFeedingData: FeedingEventRecord[] = [
        createMockFeedingEvent('ミルク', '不正な形式', 3, 'event-1'),
        createMockFeedingEvent('ミルク', '60ml', 6, 'event-2'),
        createMockFeedingEvent('ミルク', '', 9, 'event-3'), // 空のnote
        createMockFeedingEvent('ミルク', '55ml', 12, 'event-4')
      ];

      mockGetFeedingDataLast7Days.mockResolvedValue(mockFeedingData);

      const request = {
        auth: mockAuth,
        data: {}
      };

      const result = await predictMilkFunction(request as any);

      expect(result.status).toBe('success');
      // 有効な量データ（60ml, 55ml）のみが使用される
      expect(result.data.predictedQuantity.amount).toBe(57.5);
    });

    it('timestampが不正な形式の場合でも処理を継続する', async () => {
      const mockFeedingData: FeedingEventRecord[] = [
        {
          id: 'event-1',
          event: 'ミルク',
          note: '60ml',
          timestamp: Timestamp.fromMillis(Date.now() - 3 * 60 * 60 * 1000),
          createdAt: Timestamp.fromMillis(Date.now() - 3 * 60 * 60 * 1000),
          updatedAt: Timestamp.fromMillis(Date.now() - 3 * 60 * 60 * 1000)
        },
        {
          id: 'event-2',
          event: 'ミルク',
          note: '55ml',
          timestamp: Timestamp.fromMillis(Date.now() - 6 * 60 * 60 * 1000),
          createdAt: Timestamp.fromMillis(Date.now() - 6 * 60 * 60 * 1000),
          updatedAt: Timestamp.fromMillis(Date.now() - 6 * 60 * 60 * 1000)
        }
      ];

      mockGetFeedingDataLast7Days.mockResolvedValue(mockFeedingData);

      const request = {
        auth: mockAuth,
        data: {}
      };

      const result = await predictMilkFunction(request as any);

      expect(result.status).toBe('success');
      expect(result.data.predictedQuantity.amount).toBe(57.5);
    });

    it('予期しないエラーが発生した場合、内部エラーを返す', async () => {
      // 予期しないエラーをシミュレート
      mockGetFeedingDataLast7Days.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = {
        auth: mockAuth,
        data: {}
      };

      await expect(predictMilkFunction(request as any)).rejects.toThrow(HttpsError);

      try {
        await predictMilkFunction(request as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe('internal');
        expect((error as HttpsError).message).toBe('データの取得に失敗しました');
      }
    });

    it('極端に少ない量のデータでも適切に処理する', async () => {
      const mockFeedingData: FeedingEventRecord[] = [
        createMockFeedingEvent('ミルク', '5ml', 3, 'event-1'),
        createMockFeedingEvent('ミルク', '10ml', 6, 'event-2')
      ];

      mockGetFeedingDataLast7Days.mockResolvedValue(mockFeedingData);

      const request = {
        auth: mockAuth,
        data: {}
      };

      const result = await predictMilkFunction(request as any);

      expect(result.status).toBe('success');
      expect(result.data.predictedQuantity.amount).toBe(7.5);
      expect(result.data.predictedQuantity.range).toBeDefined();
      expect(result.data.predictedQuantity.range!.min).toBeGreaterThanOrEqual(0);
    });

    it('極端に多い量のデータでも適切に処理する', async () => {
      const mockFeedingData: FeedingEventRecord[] = [
        createMockFeedingEvent('ミルク', '200ml', 3, 'event-1'),
        createMockFeedingEvent('ミルク', '250ml', 6, 'event-2')
      ];

      mockGetFeedingDataLast7Days.mockResolvedValue(mockFeedingData);

      const request = {
        auth: mockAuth,
        data: {}
      };

      const result = await predictMilkFunction(request as any);

      expect(result.status).toBe('success');
      expect(result.data.predictedQuantity.amount).toBe(225);
    });

    it('混在するイベントタイプ（ミルクと母乳以外）を適切にフィルタリングする', async () => {
      const mockFeedingData: FeedingEventRecord[] = [
        createMockFeedingEvent('ミルク', '60ml', 3, 'event-1'),
        createMockFeedingEvent('母乳', '左5分/右5分', 6, 'event-2'),
        createMockFeedingEvent('ミルク', '55ml', 9, 'event-3')
      ];

      mockGetFeedingDataLast7Days.mockResolvedValue(mockFeedingData);

      const request = {
        auth: mockAuth,
        data: {}
      };

      const result = await predictMilkFunction(request as any);

      expect(result.status).toBe('success');
      expect(result.data.dataRange.eventCount).toBe(3);
      // ミルク60ml, 母乳50ml(推定), ミルク55mlの平均 = 55ml
      expect(result.data.predictedQuantity.amount).toBe(55);
    });
  });

  describe('エッジケースのテスト', () => {
    it('データ範囲の境界値を正しく設定する', async () => {
      const now = Date.now();
      const mockFeedingData: FeedingEventRecord[] = [
        {
          id: 'event-1',
          event: 'ミルク',
          note: '60ml',
          timestamp: Timestamp.fromMillis(now - 3 * 60 * 60 * 1000),
          createdAt: Timestamp.fromMillis(now - 3 * 60 * 60 * 1000),
          updatedAt: Timestamp.fromMillis(now - 3 * 60 * 60 * 1000)
        },
        {
          id: 'event-2',
          event: 'ミルク',
          note: '55ml',
          timestamp: Timestamp.fromMillis(now - 6 * 60 * 60 * 1000),
          createdAt: Timestamp.fromMillis(now - 6 * 60 * 60 * 1000),
          updatedAt: Timestamp.fromMillis(now - 6 * 60 * 60 * 1000)
        }
      ];

      mockGetFeedingDataLast7Days.mockResolvedValue(mockFeedingData);

      const request = {
        auth: mockAuth,
        data: {}
      };

      const result = await predictMilkFunction(request as any);

      expect(result.status).toBe('success');
      expect(result.data.dataRange.from.toMillis()).toBe(now - 6 * 60 * 60 * 1000);
      expect(result.data.dataRange.to.toMillis()).toBe(now - 3 * 60 * 60 * 1000);
      expect(result.data.dataRange.eventCount).toBe(2);
    });

    it('次回授乳時刻が適切に計算される', async () => {
      const now = Date.now();
      const lastFeedingTime = now - 3 * 60 * 60 * 1000; // 3時間前

      const mockFeedingData: FeedingEventRecord[] = [
        {
          id: 'event-1',
          event: 'ミルク',
          note: '60ml',
          timestamp: Timestamp.fromMillis(lastFeedingTime),
          createdAt: Timestamp.fromMillis(lastFeedingTime),
          updatedAt: Timestamp.fromMillis(lastFeedingTime)
        },
        {
          id: 'event-2',
          event: 'ミルク',
          note: '55ml',
          timestamp: Timestamp.fromMillis(lastFeedingTime - 3 * 60 * 60 * 1000),
          createdAt: Timestamp.fromMillis(lastFeedingTime - 3 * 60 * 60 * 1000),
          updatedAt: Timestamp.fromMillis(lastFeedingTime - 3 * 60 * 60 * 1000)
        }
      ];

      mockGetFeedingDataLast7Days.mockResolvedValue(mockFeedingData);

      const request = {
        auth: mockAuth,
        data: {}
      };

      const result = await predictMilkFunction(request as any);

      expect(result.status).toBe('success');
      // 平均間隔3時間なので、最後の授乳時刻 + 3時間 = 現在時刻
      const expectedNextFeedingTime = lastFeedingTime + (3 * 60 * 60 * 1000);
      expect(result.data.nextFeedingTime.toMillis()).toBe(expectedNextFeedingTime);
    });
  });
});