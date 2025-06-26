import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { User } from 'firebase/auth';
import React, { useState } from 'react';


import Auth from '../components/Auth';

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

function Home() {

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
      {user ? (
        < Welcome />
      ) : (<p>コンテンツを表示するにはログインしてください。</p>)
      }
    </div>

  );
}

export default Home;
