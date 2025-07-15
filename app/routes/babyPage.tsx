import React from 'react';
import BabyEventCard from '../components/BabyEventCard';
import { GiBabyBottle } from 'react-icons/gi';
import { FaPoop } from 'react-icons/fa';

const ICONMAP = {
  "ミルク": GiBabyBottle,
  "うんち": FaPoop
}

const BabyPage: React.FC = () => {
  return (
    <div>
      <BabyEventCard
        title="ミルク"
        eventName="ミルク"
        iconMap={ICONMAP}
      />
    </div>
  );
};

export default BabyPage;