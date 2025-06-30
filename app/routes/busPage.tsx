import React from 'react';
import Bus from '../components/Bus';
import { useUser } from '../contexts/UserContext';

const BusPage: React.FC = () => {
  const { user } = useUser();

  return (
    <div>
      <h1>Bus Page</h1>
      {user ? <Bus user={user} /> : <p>Please sign in to view bus information.</p>}
    </div>
  );
};

export default BusPage;
