import React from 'react';
import { cn } from 'tailwind-preset';

export const BreadcrumbWrapper = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn('flex px-4 py-2 items-center bg-bg-breadcrumb-bar', className)}>
      {children}
    </div>
  );
};
