import React from 'react';
import { PiSpinnerGap } from 'react-icons/pi';

type Props = {
  className?: string;
  title?: string;
  disabled?: boolean;
  loading?: boolean;
  outlined?: boolean;
  onClick: () => void;
  //children: React.ReactNode;
};

const Button: React.FC<Props> = (props) => {
  return (
    <button
      className='bg-blue-500 text-white border border-blue-500
      flex items-center justify-center rounded-lg p-1 px-3 hover:bg-blue-600 hover:border-blue-600 transition-all duration-300'
      title={props.title}
      onClick={props.onClick}
      disabled={props.disabled || props.loading} >
      {props.loading && <PiSpinnerGap className="mr-2 animate-spin" />}
      {props.title}
    </button >
  );
};

export default Button;
