import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-full w-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-telegram-primary"></div>
    </div>
  );
};
