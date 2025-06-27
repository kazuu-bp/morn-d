import React, { useEffect } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, type User } from 'firebase/auth';
import Button from './Button';

interface AuthProps {
  // 認証状態が変更された際に呼び出されるコールバック関数
  // 現在のユーザー (Userオブジェクト) または null を引数として受け取る
  onAuthStateChange: (user: User | null) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthStateChange }) => {
  // Google認証プロバイダのインスタンスを生成
  // コンポーネントの再レンダリングごとに新しいインスタンスが作られないように、
  // useStateやuseMemo/useRefで一度だけ生成するか、コンポーネント外に定義するのが一般的です。
  const provider = new GoogleAuthProvider();

  // コンポーネントがマウントされたとき（初回描画時）に一度だけ実行される
  // Firebaseの認証状態の監視をセットアップ
  useEffect(() => {
    // onAuthStateChanged メソッドは、認証状態の変化をリアルタイムで監視します
    // 戻り値の unsubscribe 関数は、監視を停止するために使います
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      // 認証状態の変更があれば、親コンポーネントに通知します
      onAuthStateChange(currentUser);
    });

    // コンポーネントがアンマウントされるとき（画面から削除されるとき）に実行されるクリーンアップ関数
    // 認証状態の監視を停止し、メモリリークを防ぎます
    return () => unsubscribe();
  }, [onAuthStateChange]); // 依存配列に onAuthStateChange を含めることで、
  // onAuthStateChange が変化した場合（通常は起こらないはず）に
  // エフェクトが再実行されます

  // Googleアカウントでのサインイン処理
  const signInWithGoogle = async () => {
    try {
      // Google認証ポップアップを表示し、ユーザーのサインインを処理
      const result = await signInWithPopup(auth, provider);
      console.log('ログイン成功:', result.user.displayName || result.user.email);
      // ここで特にステートを更新する必要はありません。
      // onAuthStateChanged が自動的に発火し、親に通知します。
    } catch (error: any) {
      // サインイン中にエラーが発生した場合の処理
      console.error('ログインエラー:', error);
      // エラーメッセージをユーザーに表示するなどの処理を追加することもできます
    }
  };

  // サインアウト処理
  const signOutWithGoogle = async () => {
    try {
      await signOut(auth);
      console.log('ログアウトしました');
      // ここでもステート更新は不要です。onAuthStateChanged が自動的に発火します。
    } catch (error: any) {
      console.error('ログアウトエラー:', error);
    }
  };

  // UIのレンダリング
  // auth.currentUser を直接参照して、現在の認証状態に基づいてUIを表示
  // auth.currentUser は、onAuthStateChanged のコールバックが発火した後に正しく設定されます
  if (auth.currentUser) {
    // ユーザーがログインしている場合のUI
    return (
      <div className='justify-end flex mr-2 mt-2'>
        <div className='justify-start flex mr-2 mt-2'>
          ようこそ、{auth.currentUser.displayName || auth.currentUser.email}さん！
        </div>
        <Button
          onClick={signOutWithGoogle}
          title="ログアウト" />
      </div>
    );
  } else {
    // ユーザーがログインしていない場合のUI
    return (
      <div>
        <div className='justify-end flex mr-2 mt-2'>
          <Button
            onClick={signInWithGoogle}
            title="Googleでログイン" />
        </div>
      </div>
    );
  }
};

export default Auth;