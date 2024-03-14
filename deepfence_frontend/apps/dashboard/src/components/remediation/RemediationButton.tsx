import React from 'react';
import { cn } from 'tailwind-preset';
import { Tooltip } from 'ui-components';

import { SparkleLineIcon } from '@/components/icons/common/SparkleLine';

export const RemediationButton = ({
  ...buttonProps
}: React.ComponentPropsWithoutRef<'button'>) => {
  return (
    <Tooltip
      triggerAsChild
      content="Remediations powered by Generative AI"
      delayDuration={200}
    >
      <button
        {...buttonProps}
        className={cn(
          'relative inline-flex items-center justify-center',
          'overflow-hidden text-sm font-medium',
          'text-gray-900 rounded group bg-gradient-to-br from-purple-500',
          'to-pink-500 group-hover:from-purple-500 group-hover:to-pink-500',
          'hover:text-white text-white',
          'focus:ring-4 focus:outline-none dark:focus:ring-purple-200 focus:ring-purple-800 shrink-0',
          buttonProps.className,
        )}
      >
        <span
          className={cn(
            'flex items-center gap-2 relative px-3 py-1 transition-all ease-in duration-75 bg-transparent rounded group-hover:bg-opacity-0 text-sm font-bold',
          )}
        >
          <span className="h-4 w-4">
            <SparkleLineIcon />
          </span>{' '}
          ThreatRx
        </span>
      </button>
    </Tooltip>
  );
};
