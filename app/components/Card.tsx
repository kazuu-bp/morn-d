import React from 'react';
import { Link } from 'react-router'

type Props = {
  className?: string;
  label?: string;
  sub?: string;
  help?: string;
  linkto: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

const Card: React.FC<Props> = (props) => {
  return (
    <div className='bg-white border-gray-200 rounded-lg border p-5 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300'>
      <Link to={props.linkto}>
        <div className='flex justify-start items-center text-gray-800'>
          {props.icon}
          <div className='ml-3'>
            {props.label}
          </div>
        </div>
      </Link >
    </div >
  );
};

export default Card;
