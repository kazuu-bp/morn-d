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
    <div className='border-orange rounded-lg border p-5 shadow'>
      <Link to={props.linkto}>
        <div className='flex justify-start items-center'>
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
