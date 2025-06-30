import { PiBaby, PiBus, PiClock } from "react-icons/pi";
import Card from "../components/Card";
import React from 'react';
import { useUser } from '../contexts/UserContext';

const Welcome: React.FC = () => {
  const { user } = useUser();

  return (
    <div>
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
                  label="育児ダッシュボード" />
                <Card
                  linkto="/bus"
                  icon={<PiBus />}
                  label="バス時刻表" />
                <Card
                  linkto="/clock"
                  icon={<PiClock />}
                  label="とけい" />
              </div>
            ) : <p>Please sign in to continue.</p>
          }
        </div>
      </main>
    </div>);
};

export default Welcome;
