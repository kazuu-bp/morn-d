import { PiBaby, PiBus, PiClock } from "react-icons/pi";
import Card from "../components/Card";
import type { User } from 'firebase/auth';
import React, { useState } from 'react';
import Auth from '../components/Auth';

const Welcome: React.FC = () => {

  // Firebase認証の状態を管理するステート
  // Authコンポーネントから受け取ったユーザー情報 (またはnull) を保持
  const [user, setUser] = useState<User | null>(null);
  /**
   * Authコンポーネントから認証状態が変更されたときに呼び出されるコールバック関数。
   * この関数を通じて、Appコンポーネントのuserステートが更新されます。
   * @param currentUser 現在のユーザーオブジェクト (ログインしていればUser型、していなければnull)
   */
  const handleAuthStateChange = (currentUser: User | null) => {
    setUser(currentUser);
  };

  return (
    <div>
      {/* Authコンポーネントを配置し、認証状態変更時のコールバックを渡す */}
      {/* Authコンポーネントは、認証UIの表示と認証ロジックを担当 */}
      <Auth onAuthStateChange={handleAuthStateChange} />
      <main className="flex items-center justify-center pt-16 pb-4">
        <div className="flex-1 flex flex-col items-center justify-center gap-16 min-h-0">
          <header className="flex flex-col items-center gap-9 text-5xl">
            Family Dashboard
          </header>
          {
            user ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[600px] mx-auto px-2">
                <Card
                  linkto="/baby"
                  icon={<PiBaby />}
                  label="育児ダッシュボード"
                  children={undefined} />
                <Card
                  linkto="/bus"
                  icon={<PiBus />}
                  label="バス時刻表"
                  children={undefined} />
                <Card
                  linkto="/clock"
                  icon={<PiClock />}
                  label="とけい"
                  children={undefined} />
              </div>
            ) : null
          }
        </div>
      </main>
    </div>);
};

export default Welcome;
