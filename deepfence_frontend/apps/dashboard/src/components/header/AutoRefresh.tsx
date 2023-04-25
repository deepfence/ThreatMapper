import React, { useState } from 'react';
import { HiChevronDown, HiRefresh } from 'react-icons/hi';
import { useRevalidator } from 'react-router-dom';
import { useInterval } from 'react-use';
import { Badge, Dropdown, DropdownItem } from 'ui-components';

// function that converts seconds to human friendly time
// e.g. 300 seconds => 5m
// e.g. 3600 seconds => 1h
// e.g. 30 seconds => 30s
function secondsToHuman(seconds: number) {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  } else {
    return `${Math.floor(seconds / 3600)}h`;
  }
}

export const AutoRefresh = () => {
  const [refreshInSeconds, setRefreshInSeconds] = useState(300);
  const { revalidate } = useRevalidator();

  useInterval(
    () => {
      revalidate();
    },
    refreshInSeconds === 0 ? null : refreshInSeconds * 1000,
  );

  return (
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
      <Badge
        className="cursor-pointer"
        color="primary"
        label={
          <>
            <div className="flex items-center gap-1 cursor-pointer">
              <HiRefresh />
              {refreshInSeconds !== 0 ? secondsToHuman(refreshInSeconds) : 'Never'}
              <HiChevronDown />
            </div>
          </>
        }
      />
    </Dropdown>
  );
};

const themeSelectedDropdownClassname = 'text-blue-500 dark:text-blue-300';
const themeDropdownClassname = 'text-gray-700 dark:text-gray-400';

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
      className={
        seconds === selectedSeconds
          ? themeSelectedDropdownClassname
          : themeDropdownClassname
      }
    >
      {children}
    </DropdownItem>
  );
};
