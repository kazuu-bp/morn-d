import * as logger from 'firebase-functions/logger';

export interface BabyEvent {
  event: string;
  timestamp: {
    _seconds: number;
    _nanoseconds: number;
  };
  note: string;
}

export interface FeedingInterval {
  intervalHours: number;
  isValid: boolean;
}

export interface QuantityData {
  amount: number;
  isEstimated: boolean;
}

export interface PredictionConfidence {
  confidence: number;
  dataQuality: 'high' | 'medium' | 'low';
}

/**
 * 授乳間隔を計算し、外れ値を除外する関数
 * @param events 時系列順にソートされた授乳イベント
 * @returns 有効な授乳間隔の配列
 */
export function calculateFeedingIntervals(events: BabyEvent[]): FeedingInterval[] {
  if (events.length < 2) {
    return [];
  }

  const intervals: FeedingInterval[] = [];

  for (let i = 0; i < events.length - 1; i++) {
    const currentEvent = events[i];
    const nextEvent = events[i + 1];

    const intervalMs
      = (nextEvent.timestamp._seconds - currentEvent.timestamp._seconds) * 1000;
    const intervalHours = intervalMs / (1000 * 1000 * 60 * 60);

    logger.info('calculateFeedingIntervals', {
      intervalHours: intervalHours
    })

    // 外れ値除外: 8時間以上の間隔は睡眠時間として除外
    const isValid = intervalHours > 0 && intervalHours < 8;

    intervals.push({
      intervalHours,
      isValid
    });
  }

  return intervals;
}

/**
 * noteフィールドから量を抽出し、平均を計算する関数
 * @param events 授乳イベントの配列
 * @returns 量データの配列
 */
export function extractAndCalculateQuantities(events: BabyEvent[]): QuantityData[] {
  const quantities: QuantityData[] = [];

  for (const event of events) {
    if (event.event === 'ミルク') {
      // ミルクの場合、noteから数値を抽出
      const match = event.note.match(/(\d+)ml/);
      if (match) {
        quantities.push({
          amount: parseInt(match[1], 10),
          isEstimated: false
        });
      }
    } else if (event.event === '母乳') {
      // 母乳の場合、標準的な量（50ml）を仮定
      quantities.push({
        amount: 50,
        isEstimated: true
      });
    }
  }

  return quantities;
}

/**
 * 信頼度を計算する関数
 * @param eventCount データ数
 * @param intervals 授乳間隔の配列
 * @returns 信頼度情報
 */
export function calculateConfidence(
  eventCount: number,
  intervals: FeedingInterval[]
): PredictionConfidence {
  if (eventCount === 0 || intervals.length === 0) {
    return {
      confidence: 0,
      dataQuality: 'low'
    };
  }

  // 有効な間隔のみを抽出
  const validIntervals = intervals
    .filter(interval => interval.isValid)
    .map(interval => interval.intervalHours);

  if (validIntervals.length === 0) {
    return {
      confidence: 0,
      dataQuality: 'low'
    };
  }

  // 平均間隔を計算
  const averageInterval = validIntervals.reduce((sum, interval) => sum + interval, 0) / validIntervals.length;

  // 標準偏差を計算
  const variance = validIntervals.reduce((sum, interval) => {
    return sum + Math.pow(interval - averageInterval, 2);
  }, 0) / validIntervals.length;
  const standardDeviation = Math.sqrt(variance);

  // データ量による信頼度（最大0.7）
  const dataVolumeConfidence = Math.min((eventCount / 14) * 0.7, 0.7);

  // 一貫性による信頼度（最大0.3）
  const consistencyConfidence = averageInterval > 0
    ? Math.min((1 - (standardDeviation / averageInterval)) * 0.3, 0.3)
    : 0;

  const totalConfidence = Math.max(0, Math.min(1, dataVolumeConfidence + consistencyConfidence));

  // データ品質の判定
  let dataQuality: 'high' | 'medium' | 'low';
  if (totalConfidence >= 0.7) {
    dataQuality = 'high';
  } else if (totalConfidence >= 0.4) {
    dataQuality = 'medium';
  } else {
    dataQuality = 'low';
  }

  return {
    confidence: totalConfidence,
    dataQuality
  };
}

/**
 * 平均授乳間隔を計算する関数
 * @param intervals 授乳間隔の配列
 * @returns 平均間隔（時間）
 */
export function calculateAverageInterval(intervals: FeedingInterval[]): number {
  const validIntervals = intervals
    .filter(interval => interval.isValid)
    .map(interval => interval.intervalHours);

  if (validIntervals.length === 0) {
    return 0;
  }

  return validIntervals.reduce((sum, interval) => sum + interval, 0) / validIntervals.length;
}

/**
 * 平均授乳量を計算する関数
 * @param quantities 量データの配列
 * @returns 平均量と範囲情報
 */
export function calculateAverageQuantity(quantities: QuantityData[]): {
  average: number;
  range?: { min: number; max: number };
  hasRange: boolean;
} {
  if (quantities.length === 0) {
    return { average: 0, hasRange: false };
  }

  const amounts = quantities.map(q => q.amount);
  const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;

  // 標準偏差を計算して範囲表示の必要性を判定
  const variance = amounts.reduce((sum, amount) => {
    return sum + Math.pow(amount - average, 2);
  }, 0) / amounts.length;
  const standardDeviation = Math.sqrt(variance);

  // 標準偏差が平均の20%以上の場合は範囲表示
  const hasRange = standardDeviation / average > 0.2;

  if (hasRange) {
    const min = Math.max(0, Math.round(average - standardDeviation));
    const max = Math.round(average + standardDeviation);
    return {
      average: Math.round(average),
      range: { min, max },
      hasRange: true
    };
  }

  return {
    average: Math.round(average),
    hasRange: false
  };
}