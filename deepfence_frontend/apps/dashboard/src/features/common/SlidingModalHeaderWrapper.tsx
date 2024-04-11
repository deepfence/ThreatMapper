import React from 'react';
import { cn } from 'tailwind-preset';

export const SlidingModalHeaderWrapper = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'p-4 text-h3 text-text-text-and-icon dark:bg-bg-header bg-bg-breadcrumb-bar',
        className,
      )}
    >
      {children}
    </div>
  );
};
