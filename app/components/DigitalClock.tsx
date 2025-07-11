import React, { useState, useEffect } from 'react';

const DigitalClock: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div>
      <h1>現在時刻: {currentTime.toLocaleTimeString()}</h1>
    </div>
  );
};

export default DigitalClock;