import React from 'react';
import { useUser } from '../contexts/UserContext';
import BusCard from '../components/BusCard';

const dept1: string = import.meta.env.VITE_APP_BUS_DEPT1 ?? '三鷹駅';
const dest1: string = import.meta.env.VITE_APP_BUS_DEST1 ?? '調布駅北口';
const fetchBusTimeRequestData1 = {
  dept: dept1,
  dest: dest1
};

const dept2: string = import.meta.env.VITE_APP_BUS_DEPT2 ?? '三鷹駅';
const dest2: string = import.meta.env.VITE_APP_BUS_DEST2 ?? '調布駅北口';
const fetchBusTimeRequestData2 = {
  dept: dept2,
  dest: dest2
};

const BusPage: React.FC = () => {
  const { user } = useUser();

  return (
    <div>
      {user ? (<>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[800px] mx-auto px-2'>
          <div className='bg-white border-gray-200 rounded-lg border p-5 shadow-md transition-all duration-300'>
            <BusCard
              user={user}
              fetchBusTimeRequestData={fetchBusTimeRequestData1}
            />
          </div>
          <div className='bg-white border-gray-200 rounded-lg border p-5 shadow-md transition-all duration-300'>
            <BusCard
              user={user}
              fetchBusTimeRequestData={fetchBusTimeRequestData2}
            />
          </div>
        </div>
      </>) : (<p>Please sign in to view bus information.</p>)}
    </div>
  );
};

export default BusPage;
