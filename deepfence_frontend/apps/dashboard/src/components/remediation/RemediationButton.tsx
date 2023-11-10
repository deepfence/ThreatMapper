import React from 'react';
import { cn } from 'tailwind-preset';

import { SparkleLineIcon } from '@/components/icons/common/SparkleLine';

export const RemediationButton = ({
  active,
  ...buttonProps
}: React.ComponentPropsWithoutRef<'button'> & { active: boolean }) => {
  return (
    <button
      {...buttonProps}
      className={cn(
        'relative inline-flex items-center justify-center',
        'p-0.5 overflow-hidden text-sm font-medium',
        'text-gray-900 rounded group bg-gradient-to-br from-purple-500',
        'to-pink-500 group-hover:from-purple-500 group-hover:to-pink-500',
        'hover:text-white dark:text-white',
        'focus:ring-4 focus:outline-none focus:ring-purple-200 dark:focus:ring-purple-800',
        buttonProps.className,
      )}
    >
      <span
        className={cn(
          'flex items-center gap-2 uppercase relative px-3 py-1 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded group-hover:bg-opacity-0 text-t3',
          { 'dark:bg-transparent': active },
        )}
      >
        <span className="h-4 w-4">
          <SparkleLineIcon />
        </span>{' '}
        Remediation
      </span>
    </button>
  );
};
