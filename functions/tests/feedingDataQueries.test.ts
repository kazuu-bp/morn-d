import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as admin from 'firebase-admin';
import { getFeedingDataLast7Days, getFeedingDataByDateRange, getLatestFeedingEvents } from '../src/queries/feedingDataQueries';

// Firebase Adminのモック
vi.mock('firebase-admin', () => ({
  firestore: vi.fn(),
  initializeApp: vi.fn(),
}));

// Firebase Functions Loggerのモック
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

describe('feedingDataQueries', () => {
  let mockFirestore: any;
  let mockCollection: any;
  let mockQuery: any;
  let mockGet: any;

  beforeEach(() => {
    // Firestoreのモックセットアップ
    mockGet = vi.fn();

    // クエリチェーンのモック
    mockQuery = {
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: mockGet
    };

    mockCollection = vi.fn().mockReturnValue(mockQuery);

    mockFirestore = {
      collection: mockCollection,
      Timestamp: {
        fromDate: vi.fn((date: Date) => ({
          _seconds: Math.floor(date.getTime() / 1000),
          _nanoseconds: (date.getTime() % 1000) * 1000000
        }))
      }
    };

    (admin.firestore as any).mockReturnValue(mockFirestore);
    (admin.firestore as any).Timestamp = mockFirestore.Timestamp;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getFeedingDataLast7Days', () => {
    it('過去7日間の授乳データを正常に取得できる', async () => {
      // テストデータの準備
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({
            event: 'ミルク',
            timestamp: { _seconds: 1642000000, _nanoseconds: 0 },
            note: '60ml',
            createdAt: { _seconds: 1642000000, _nanoseconds: 0 }
          })
        },
        {
          id: 'doc2',
          data: () => ({
            event: '母乳',
            timestamp: { _seconds: 1641900000, _nanoseconds: 0 },
            note: '左5分/右5分',
            createdAt: { _seconds: 1641900000, _nanoseconds: 0 }
          })
        }
      ];

      const mockQuerySnapshot = {
        forEach: vi.fn((callback: any) => {
          mockDocs.forEach(callback);
        })
      };

      mockGet.mockResolvedValue(mockQuerySnapshot);

      // 関数実行
      const result = await getFeedingDataLast7Days('test-user-id');

      // 検証
      expect(mockCollection).toHaveBeenCalledWith('babyEvents');
      expect(mockQuery.where).toHaveBeenCalledWith('event', 'in', ['ミルク', '母乳']);
      expect(mockQuery.orderBy).toHaveBeenCalledWith('timestamp', 'desc');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'doc1',
        event: 'ミルク',
        timestamp: { _seconds: 1642000000, _nanoseconds: 0 },
        note: '60ml',
        createdAt: { _seconds: 1642000000, _nanoseconds: 0 },
        updatedAt: undefined
      });
    });

    it('データが存在しない場合は空配列を返す', async () => {
      const mockQuerySnapshot = {
        forEach: vi.fn()
      };

      mockGet.mockResolvedValue(mockQuerySnapshot);

      const result = await getFeedingDataLast7Days('test-user-id');

      expect(result).toEqual([]);
    });

    it('Firestoreエラーが発生した場合は適切にエラーを投げる', async () => {
      const errorMessage = 'Firestore connection error';
      mockGet.mockRejectedValue(new Error(errorMessage));

      await expect(getFeedingDataLast7Days('test-user-id'))
        .rejects
        .toThrow(`Failed to retrieve feeding data: ${errorMessage}`);
    });
  });

  describe('getFeedingDataByDateRange', () => {
    it('指定された期間の授乳データを正常に取得できる', async () => {
      const fromDate = new Date('2024-01-01T00:00:00Z');
      const toDate = new Date('2024-01-07T23:59:59Z');

      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({
            event: 'ミルク',
            timestamp: { _seconds: 1704067200, _nanoseconds: 0 },
            note: '50ml'
          })
        }
      ];

      const mockQuerySnapshot = {
        forEach: vi.fn((callback: any) => {
          mockDocs.forEach(callback);
        })
      };

      mockGet.mockResolvedValue(mockQuerySnapshot);

      const result = await getFeedingDataByDateRange('test-user-id', fromDate, toDate);

      expect(mockQuery.where).toHaveBeenCalledWith('event', 'in', ['ミルク', '母乳']);
      expect(result).toHaveLength(1);
      expect(result[0].event).toBe('ミルク');
    });

    it('期間外のデータは取得されない', async () => {
      const fromDate = new Date('2024-01-01T00:00:00Z');
      const toDate = new Date('2024-01-07T23:59:59Z');

      const mockQuerySnapshot = {
        forEach: vi.fn()
      };

      mockGet.mockResolvedValue(mockQuerySnapshot);

      const result = await getFeedingDataByDateRange('test-user-id', fromDate, toDate);

      expect(result).toEqual([]);
    });
  });

  describe('getLatestFeedingEvents', () => {
    it('最新の授乳イベントを指定件数取得できる', async () => {
      const mockDocs = [
        {
          id: 'latest-doc',
          data: () => ({
            event: 'ミルク',
            timestamp: { _seconds: 1642100000, _nanoseconds: 0 },
            note: '70ml'
          })
        }
      ];

      const mockQuerySnapshot = {
        forEach: vi.fn((callback: any) => {
          mockDocs.forEach(callback);
        })
      };

      mockGet.mockResolvedValue(mockQuerySnapshot);

      const result = await getLatestFeedingEvents('test-user-id', 1);

      expect(mockQuery.limit).toHaveBeenCalledWith(1);
      expect(mockQuery.orderBy).toHaveBeenCalledWith('timestamp', 'desc');
      expect(result).toHaveLength(1);
      expect(result[0].event).toBe('ミルク');
    });

    it('デフォルトで1件取得する', async () => {
      const mockQuerySnapshot = {
        forEach: vi.fn()
      };

      mockGet.mockResolvedValue(mockQuerySnapshot);

      await getLatestFeedingEvents('test-user-id');

      expect(mockQuery.limit).toHaveBeenCalledWith(1);
    });

    it('複数件の取得も可能', async () => {
      const mockDocs = Array.from({ length: 3 }, (_, i) => ({
        id: `doc${i}`,
        data: () => ({
          event: i % 2 === 0 ? 'ミルク' : '母乳',
          timestamp: { _seconds: 1642000000 - i * 3600, _nanoseconds: 0 },
          note: i % 2 === 0 ? `${50 + i * 10}ml` : '左5分/右5分'
        })
      }));

      const mockQuerySnapshot = {
        forEach: vi.fn((callback: any) => {
          mockDocs.forEach(callback);
        })
      };

      mockGet.mockResolvedValue(mockQuerySnapshot);

      const result = await getLatestFeedingEvents('test-user-id', 3);

      expect(mockQuery.limit).toHaveBeenCalledWith(3);
      expect(result).toHaveLength(3);
    });
  });

  describe('エラーハンドリング', () => {
    it('全ての関数でFirestoreエラーを適切に処理する', async () => {
      const firestoreError = new Error('Permission denied');
      mockGet.mockRejectedValue(firestoreError);

      // getFeedingDataLast7Days
      await expect(getFeedingDataLast7Days('test-user-id'))
        .rejects
        .toThrow('Failed to retrieve feeding data: Permission denied');

      // getFeedingDataByDateRange
      const fromDate = new Date();
      const toDate = new Date();
      await expect(getFeedingDataByDateRange('test-user-id', fromDate, toDate))
        .rejects
        .toThrow('Failed to retrieve feeding data: Permission denied');

      // getLatestFeedingEvents
      await expect(getLatestFeedingEvents('test-user-id'))
        .rejects
        .toThrow('Failed to retrieve latest feeding events: Permission denied');
    });
  });

  describe('データ形式の検証', () => {
    it('noteフィールドが存在しない場合は空文字列を設定する', async () => {
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({
            event: 'ミルク',
            timestamp: { _seconds: 1642000000, _nanoseconds: 0 }
            // noteフィールドなし
          })
        }
      ];

      const mockQuerySnapshot = {
        forEach: vi.fn((callback: any) => {
          mockDocs.forEach(callback);
        })
      };

      mockGet.mockResolvedValue(mockQuerySnapshot);

      const result = await getFeedingDataLast7Days('test-user-id');

      expect(result[0].note).toBe('');
    });

    it('createdAtとupdatedAtフィールドが正しく設定される', async () => {
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({
            event: 'ミルク',
            timestamp: { _seconds: 1642000000, _nanoseconds: 0 },
            note: '60ml',
            createdAt: { _seconds: 1641999000, _nanoseconds: 0 },
            updatedAt: { _seconds: 1642000500, _nanoseconds: 0 }
          })
        }
      ];

      const mockQuerySnapshot = {
        forEach: vi.fn((callback: any) => {
          mockDocs.forEach(callback);
        })
      };

      mockGet.mockResolvedValue(mockQuerySnapshot);

      const result = await getFeedingDataLast7Days('test-user-id');

      expect(result[0].createdAt).toEqual({ _seconds: 1641999000, _nanoseconds: 0 });
      expect(result[0].updatedAt).toEqual({ _seconds: 1642000500, _nanoseconds: 0 });
    });
  });
});