import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { type User } from 'firebase/auth';
import { UserProvider } from '../contexts/UserContext';
import Auth from '../components/Auth';
import type { Route } from "./+types/home";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function meta({ data }: Route.MetaArgs) {
  return [
    { title: "Family Dashboard" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  // useCallback を使って関数をメモ化し、Authコンポーネントの不要な再レンダリングを防ぎます。
  const handleAuthStateChange = useCallback((currentUser: User | null) => {
    setUser(currentUser);
  }, []);

  return (
    <UserProvider user={user}>
      <Auth onAuthStateChange={handleAuthStateChange} />
      <Outlet />
    </UserProvider>
  );
};
