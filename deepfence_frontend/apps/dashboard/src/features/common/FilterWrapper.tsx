import React from 'react';
import { cn } from 'tailwind-preset';

export const FilterWrapper = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'px-4 py-2.5 mb-4 border border-bg-hover-3 rounded-[5px] overflow-hidden dark:bg-bg-left-nav bg-white',
        className,
      )}
    >
      {children}
    </div>
  );
};
