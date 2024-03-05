import React from 'react';

export const FilterWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="px-4 py-2.5 mb-4 border border-bg-hover-3 rounded-[5px] overflow-hidden dark:bg-bg-left-nav bg-white">
      {children}
    </div>
  );
};
