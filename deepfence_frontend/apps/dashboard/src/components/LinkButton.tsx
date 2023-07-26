import React from 'react';
import { cn } from 'tailwind-preset';

import { DFLink } from '@/components/DFLink';

export const LinkButton = ({
  to,
  sizing = 'xs',
  children,
}: {
  to: string;
  sizing?: 'xs' | 'sm' | 'md';
  children?: React.ReactNode;
}) => {
  return (
    <DFLink
      to={to}
      className={cn(
        'flex items-center hover:no-underline focus:no-underline active:no-underline',
        'text-gray-800 dark:text-gray-100 hover:text-blue-600 hover:dark:text-blue-500',
        'visited:text-gray-800 dark:visited:text-gray-100',
        {
          'text-xs': sizing === 'xs',
          'text-sm': sizing === 'sm',
          'text-md': sizing === 'md',
        },
      )}
    >
      {children ? children : null}
    </DFLink>
  );
};
