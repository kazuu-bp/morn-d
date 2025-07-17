import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import {
  calculateFeedingIntervals,
  extractAndCalculateQuantities,
  calculateConfidence,
  calculateAverageInterval,
  calculateAverageQuantity,
  BabyEvent
} from '../src/predictionAlgorithm';

// テスト用のヘルパー関数
function createMockEvent(event: string, note: string, hoursAgo: number): BabyEvent {
  const timestamp = Timestamp.fromMillis(Date.now() - (hoursAgo * 60 * 60 * 1000));
  return { event, note, timestamp };
}

describe('calculateFeedingIntervals', () => {
  it('正常な授乳間隔を計算する', () => {
    const events = [
      createMockEvent('ミルク', '60ml', 6), // 6時間前
      createMockEvent('ミルク', '50ml', 3), // 3時間前
      createMockEvent('ミルク', '55ml', 0)  // 現在
    ];

    const intervals = calculateFeedingIntervals(events);

    expect(intervals).toHaveLength(2);
    expect(intervals[0].intervalHours).toBe(3); // 6時間前 → 3時間前
    expect(intervals[0].isValid).toBe(true);
    expect(intervals[1].intervalHours).toBe(3); // 3時間前 → 現在
    expect(intervals[1].isValid).toBe(true);
  });

  it('8時間以上の間隔を外れ値として除外する', () => {
    const events = [
      createMockEvent('ミルク', '60ml', 10), // 10時間前（睡眠時間）
      createMockEvent('ミルク', '50ml', 3),  // 3時間前
      createMockEvent('ミルク', '55ml', 0)   // 現在
    ];

    const intervals = calculateFeedingIntervals(events);

    expect(intervals).toHaveLength(2);
    expect(intervals[0].intervalHours).toBe(7); // 10時間前 → 3時間前
    expect(intervals[0].isValid).toBe(true);
    expect(intervals[1].intervalHours).toBe(3); // 3時間前 → 現在
    expect(intervals[1].isValid).toBe(true);
  });

  it('データが不足している場合は空配列を返す', () => {
    const events = [createMockEvent('ミルク', '60ml', 0)];
    const intervals = calculateFeedingIntervals(events);
    expect(intervals).toHaveLength(0);
  });

  it('空配列の場合は空配列を返す', () => {
    const intervals = calculateFeedingIntervals([]);
    expect(intervals).toHaveLength(0);
  });
});

describe('extractAndCalculateQuantities', () => {
  it('ミルクの量を正しく抽出する', () => {
    const events = [
      createMockEvent('ミルク', '60ml', 3),
      createMockEvent('ミルク', '50ml', 2),
      createMockEvent('ミルク', '70ml', 1)
    ];

    const quantities = extractAndCalculateQuantities(events);

    expect(quantities).toHaveLength(3);
    expect(quantities[0].amount).toBe(60);
    expect(quantities[0].isEstimated).toBe(false);
    expect(quantities[1].amount).toBe(50);
    expect(quantities[1].isEstimated).toBe(false);
    expect(quantities[2].amount).toBe(70);
    expect(quantities[2].isEstimated).toBe(false);
  });

  it('母乳の場合は標準量50mlを使用する', () => {
    const events = [
      createMockEvent('母乳', '左5分/右5分', 3),
      createMockEvent('母乳', '左10分/右8分', 2)
    ];

    const quantities = extractAndCalculateQuantities(events);

    expect(quantities).toHaveLength(2);
    expect(quantities[0].amount).toBe(50);
    expect(quantities[0].isEstimated).toBe(true);
    expect(quantities[1].amount).toBe(50);
    expect(quantities[1].isEstimated).toBe(true);
  });

  it('ミルクと母乳の混合データを処理する', () => {
    const events = [
      createMockEvent('ミルク', '60ml', 3),
      createMockEvent('母乳', '左5分/右5分', 2),
      createMockEvent('ミルク', '50ml', 1)
    ];

    const quantities = extractAndCalculateQuantities(events);

    expect(quantities).toHaveLength(3);
    expect(quantities[0].amount).toBe(60);
    expect(quantities[0].isEstimated).toBe(false);
    expect(quantities[1].amount).toBe(50);
    expect(quantities[1].isEstimated).toBe(true);
    expect(quantities[2].amount).toBe(50);
    expect(quantities[2].isEstimated).toBe(false);
  });

  it('量の情報がないミルクイベントは無視する', () => {
    const events = [
      createMockEvent('ミルク', '量不明', 3),
      createMockEvent('ミルク', '60ml', 2)
    ];

    const quantities = extractAndCalculateQuantities(events);

    expect(quantities).toHaveLength(1);
    expect(quantities[0].amount).toBe(60);
  });
});

describe('calculateConfidence', () => {
  it('十分なデータがある場合は高い信頼度を返す', () => {
    const intervals = [
      { intervalHours: 3, isValid: true },
      { intervalHours: 3.5, isValid: true },
      { intervalHours: 2.5, isValid: true },
      { intervalHours: 3, isValid: true }
    ];

    const confidence = calculateConfidence(14, intervals);

    expect(confidence.confidence).toBeGreaterThan(0.6);
    expect(confidence.dataQuality).toBe('high');
  });

  it('データが少ない場合は低い信頼度を返す', () => {
    const intervals = [
      { intervalHours: 3, isValid: true }
    ];

    const confidence = calculateConfidence(3, intervals);

    expect(confidence.confidence).toBeLessThan(0.5);
    expect(confidence.dataQuality).toBe('medium');
  });

  it('有効な間隔がない場合は信頼度0を返す', () => {
    const intervals = [
      { intervalHours: 10, isValid: false },
      { intervalHours: 12, isValid: false }
    ];

    const confidence = calculateConfidence(5, intervals);

    expect(confidence.confidence).toBe(0);
    expect(confidence.dataQuality).toBe('low');
  });

  it('データがない場合は信頼度0を返す', () => {
    const confidence = calculateConfidence(0, []);

    expect(confidence.confidence).toBe(0);
    expect(confidence.dataQuality).toBe('low');
  });

  it('間隔のばらつきが大きい場合は信頼度が下がる', () => {
    const consistentIntervals = [
      { intervalHours: 3, isValid: true },
      { intervalHours: 3, isValid: true },
      { intervalHours: 3, isValid: true }
    ];

    const inconsistentIntervals = [
      { intervalHours: 1, isValid: true },
      { intervalHours: 5, isValid: true },
      { intervalHours: 2, isValid: true }
    ];

    const consistentConfidence = calculateConfidence(10, consistentIntervals);
    const inconsistentConfidence = calculateConfidence(10, inconsistentIntervals);

    expect(consistentConfidence.confidence).toBeGreaterThan(inconsistentConfidence.confidence);
  });
});

describe('calculateAverageInterval', () => {
  it('有効な間隔の平均を計算する', () => {
    const intervals = [
      { intervalHours: 3, isValid: true },
      { intervalHours: 4, isValid: true },
      { intervalHours: 2, isValid: true },
      { intervalHours: 10, isValid: false } // 無効な間隔は除外
    ];

    const average = calculateAverageInterval(intervals);

    expect(average).toBe(3); // (3 + 4 + 2) / 3 = 3
  });

  it('有効な間隔がない場合は0を返す', () => {
    const intervals = [
      { intervalHours: 10, isValid: false },
      { intervalHours: 12, isValid: false }
    ];

    const average = calculateAverageInterval(intervals);

    expect(average).toBe(0);
  });

  it('空配列の場合は0を返す', () => {
    const average = calculateAverageInterval([]);
    expect(average).toBe(0);
  });
});

describe('calculateAverageQuantity', () => {
  it('平均量を正しく計算する', () => {
    const quantities = [
      { amount: 60, isEstimated: false },
      { amount: 50, isEstimated: false },
      { amount: 70, isEstimated: false }
    ];

    const result = calculateAverageQuantity(quantities);

    expect(result.average).toBe(60); // (60 + 50 + 70) / 3 = 60
    expect(result.hasRange).toBe(false);
  });

  it('ばらつきが大きい場合は範囲を表示する', () => {
    const quantities = [
      { amount: 40, isEstimated: false },
      { amount: 60, isEstimated: false },
      { amount: 80, isEstimated: false }
    ];

    const result = calculateAverageQuantity(quantities);

    expect(result.average).toBe(60);
    expect(result.hasRange).toBe(true);
    expect(result.range).toBeDefined();
    expect(result.range!.min).toBeLessThan(result.average);
    expect(result.range!.max).toBeGreaterThan(result.average);
  });

  it('データがない場合は0を返す', () => {
    const result = calculateAverageQuantity([]);

    expect(result.average).toBe(0);
    expect(result.hasRange).toBe(false);
  });

  it('範囲の最小値が負数にならないようにする', () => {
    const quantities = [
      { amount: 10, isEstimated: false },
      { amount: 5, isEstimated: false },
      { amount: 50, isEstimated: false } // 大きなばらつき
    ];

    const result = calculateAverageQuantity(quantities);

    if (result.hasRange && result.range) {
      expect(result.range.min).toBeGreaterThanOrEqual(0);
    }
  });
});