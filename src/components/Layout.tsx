import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-bgGray flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-lg relative flex flex-col">
        {children}
      </div>
    </div>
  );
};