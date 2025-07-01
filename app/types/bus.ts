import { type User } from 'firebase/auth'; // User型をインポート


/**
 * バス1便の出発時刻と到着時刻を格納するためのインターフェース
 */
export interface BusTimeEntry {
  deptTime?: string; // 出発時刻
  destTime?: string; // 到着時刻
}

/**
 * _fetchBusTime 関数の戻り値の型
 */
export type BusTimeData = BusTimeEntry[];

export interface fetchBusTimeResponseData {
  status: 'success' | 'error';
  message: string;
  busTimeData?: BusTimeData; // 成功時にバス時刻データを含める
  errorCode?: string; // エラー時にエラーコードを含める (HttpsErrorのcodeに対応)
}

export interface BusTimetableProps {
  user: User;// | null; // App.tsx から user を受け取ることを明確に型定義
  fetchBusTimeRequestData: fetchBusTimeRequestData;
}

export type fetchBusTimeRequestData = {
  dept: string;
  dest: string;
}