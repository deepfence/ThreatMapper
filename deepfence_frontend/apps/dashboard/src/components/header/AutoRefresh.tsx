import React, { useEffect, useState } from 'react';
import { useRevalidator } from 'react-router-dom';
import { useInterval } from 'react-use';
import { cn } from 'tailwind-preset';
import { Dropdown, DropdownItem } from 'ui-components';

import { CaretDown } from '@/components/icons/common/CaretDown';
import { RefreshIcon } from '@/components/icons/common/Refresh';
import { queryClient } from '@/queries/client';

// function that converts seconds to human friendly time
// e.g. 300 seconds => 5m
// e.g. 3600 seconds => 1h
// e.g. 30 seconds => 30s
function secondsToHuman(seconds: number) {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} min`;
  } else {
    return `${Math.floor(seconds / 3600)} hour`;
  }
}

export const AutoRefresh = () => {
  const [refreshInSeconds, setRefreshInSeconds] = useState(300);
  const { revalidate, state } = useRevalidator();
  const [spinning, setSpinning] = useState(false);

  useInterval(
    () => {
      if (state === 'idle') {
        revalidate();
        queryClient.refetchQueries({
          type: 'active',
        });
      }
    },
    refreshInSeconds === 0 ? null : refreshInSeconds * 1000,
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSpinning(false);
    }, 1000);
    return () => {
      clearTimeout(timeout);
    };
  }, [spinning]);

  return (
    <div className="flex gap-3 items-stretch dark:text-text-text-and-icon text-bg-grid-border">
      <button
        className="flex items-center justify-center"
        title="Refresh now"
        onClick={() => {
          if (state === 'idle') {
            revalidate();
            queryClient.refetchQueries({
              type: 'active',
            });
            setSpinning(true);
          }
        }}
      >
        <span
          className={cn('w-6 h-4', {
            'animate-spin direction-reverse': spinning,
          })}
        >
          <RefreshIcon />
        </span>
      </button>
      <Dropdown
        align="end"
        content={
          <>
            <RefreshDropdownItem
              onClick={(seconds) => {
                setRefreshInSeconds(seconds);
              }}
              seconds={180}
              selectedSeconds={refreshInSeconds}
            >
              3 Minutes
            </RefreshDropdownItem>
            <RefreshDropdownItem
              onClick={(seconds) => {
                setRefreshInSeconds(seconds);
              }}
              seconds={300}
              selectedSeconds={refreshInSeconds}
            >
              5 Minutes
            </RefreshDropdownItem>
            <RefreshDropdownItem
              onClick={(seconds) => {
                setRefreshInSeconds(seconds);
              }}
              seconds={600}
              selectedSeconds={refreshInSeconds}
            >
              10 Minutes
            </RefreshDropdownItem>
            <RefreshDropdownItem
              onClick={(seconds) => {
                setRefreshInSeconds(seconds);
              }}
              seconds={1800}
              selectedSeconds={refreshInSeconds}
            >
              30 Minutes
            </RefreshDropdownItem>
            <RefreshDropdownItem
              onClick={(seconds) => {
                setRefreshInSeconds(seconds);
              }}
              seconds={3600}
              selectedSeconds={refreshInSeconds}
            >
              1 Hour
            </RefreshDropdownItem>
            <RefreshDropdownItem
              onClick={(seconds) => {
                setRefreshInSeconds(seconds);
              }}
              seconds={0}
              selectedSeconds={refreshInSeconds}
            >
              Never
            </RefreshDropdownItem>
          </>
        }
      >
        <div className="flex items-center gap-1 cursor-pointer px-2 text-p2 select-none">
          <span>Refresh data</span>
          <span className="dark:text-text-input-value text-text-text-inverse text-h6">
            {refreshInSeconds !== 0 ? secondsToHuman(refreshInSeconds) : 'Never'}
          </span>
          <span className="w-3 h-3">
            <CaretDown />
          </span>
        </div>
      </Dropdown>
    </div>
  );
};

const RefreshDropdownItem = ({
  seconds,
  selectedSeconds,
  onClick,
  children,
}: {
  seconds: number;
  selectedSeconds: number;
  onClick: (seconds: number) => void;
  children: React.ReactNode;
}) => {
  return (
    <DropdownItem
      onClick={() => {
        onClick(seconds);
      }}
      selected={seconds === selectedSeconds}
    >
      {children}
    </DropdownItem>
  );
};
