import React from 'react';
import BabyEventCard from '../components/BabyEventCard';
import { GiBabyBottle } from 'react-icons/gi';
import { FaPoop } from 'react-icons/fa';
import { FaPersonBreastfeeding } from "react-icons/fa6";

const ICONMAP = {
  "ミルク": GiBabyBottle,
  "うんち": FaPoop,
  "授乳": FaPersonBreastfeeding
}

const BabyPage: React.FC = () => {
  return (
    <div>
      <BabyEventCard
        title="ミルク"
        eventName="ミルク"
        iconMap={ICONMAP}
      />
      <BabyEventCard
        title="授乳"
        eventName="授乳"
        iconMap={ICONMAP}
      />
    </div>
  );
};

export default BabyPage;