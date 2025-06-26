import { PiBaby, PiBus, PiClock } from "react-icons/pi";
import Card from "../components/Card";

export function Welcome() {
  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <header className="flex flex-col items-center gap-9 text-5xl">
          Home
        </header>
        <div className="max-w-[300px] w-full space-y-6 px-4">
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
      </div>
    </main>

  );
}

