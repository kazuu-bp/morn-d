import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { getFeedingDataLast7Days } from '../src/queries/feedingDataQueries';
import { predictMilkFunction } from '../src/predictMilkFunction';

// Mock Firebase Admin
vi.mock('firebase-admin', () => {
  const mockTimestamp = {
    fromDate: vi.fn((date) => ({
      toMillis: () => date.getTime(),
      toDate: () => date
    })),
    fromMillis: vi.fn((ms) => ({
      toMillis: () => ms,
      toDate: () => new Date(ms)
    }))
  };

  return {
    firestore: {
      Timestamp: mockTimestamp
    }
  };
});

// Mock Firebase Functions Logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}));

// Mock Feeding Data Queries
vi.mock('../src/queries/feedingDataQueries', () => ({
  getFeedingDataLast7Days: vi.fn()
}));

describe('predictMilkFunction', () => {
  const mockAuth = {
    uid: 'test-user-id',
    token: {}
  };

  const mockRequest = {
    auth: mockAuth,
    data: {}
  };

  const mockFeedingEvents = [
    {
      id: '1',
      event: 'ミルク',
      note: '60ml',
      timestamp: {
        toMillis: () => new Date('2025-07-15T09:00:00Z').getTime(),
        toDate: () => new Date('2025-07-15T09:00:00Z')
      },
      createdAt: {},
      updatedAt: {}
    },
    {
      id: '2',
      event: '母乳',
      note: '左5分/右5分',
      timestamp: {
        toMillis: () => new Date('2025-07-15T12:00:00Z').getTime(),
        toDate: () => new Date('2025-07-15T12:00:00Z')
      },
      createdAt: {},
      updatedAt: {}
    },
    {
      id: '3',
      event: 'ミルク',
      note: '70ml',
      timestamp: {
        toMillis: () => new Date('2025-07-15T15:00:00Z').getTime(),
        toDate: () => new Date('2025-07-15T15:00:00Z')
      },
      createdAt: {},
      updatedAt: {}
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw an error when user is not authenticated', async () => {
    const unauthenticatedRequest = { ...mockRequest, auth: null };

    await expect(predictMilkFunction(unauthenticatedRequest)).rejects.toThrow(HttpsError);
    await expect(predictMilkFunction(unauthenticatedRequest)).rejects.toThrow('認証が必要です');
  });

  it('should throw an error when there is insufficient data', async () => {
    (getFeedingDataLast7Days as any).mockResolvedValue([mockFeedingEvents[0]]);

    await expect(predictMilkFunction(mockRequest)).rejects.toThrow(HttpsError);
    await expect(predictMilkFunction(mockRequest)).rejects.toThrow('予測に十分なデータがありません');
  });

  it('should return a successful prediction with sufficient data', async () => {
    (getFeedingDataLast7Days as any).mockResolvedValue(mockFeedingEvents);

    const result = await predictMilkFunction(mockRequest);

    expect(result.status).toBe('success');
    expect(result.data).toBeDefined();
    expect(result.data.nextFeedingTime).toBeDefined();
    expect(result.data.predictedQuantity).toBeDefined();
    expect(result.data.confidence).toBeGreaterThanOrEqual(0);
    expect(result.data.confidence).toBeLessThanOrEqual(1);
    expect(result.data.dataRange).toBeDefined();
    expect(result.data.dataRange.eventCount).toBe(mockFeedingEvents.length);
    expect(result.data.isPrediction).toBe(true);
  });

  it('should handle database query errors', async () => {
    (getFeedingDataLast7Days as any).mockRejectedValue(new Error('Database error'));

    await expect(predictMilkFunction(mockRequest)).rejects.toThrow(HttpsError);
    await expect(predictMilkFunction(mockRequest)).rejects.toThrow('データの取得に失敗しました');
  });
});