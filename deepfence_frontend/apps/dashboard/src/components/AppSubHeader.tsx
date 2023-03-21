import React, { forwardRef } from 'react';
import { useMeasure } from 'react-use';

export interface DashboardHeaderProps {
  sideNavExpanded: boolean;
  onSideNavExpandedChange: (expanded: boolean) => void;
}

export const AppSubHeader = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => {
    return (
      <header
        className="fixed w-full top-[64px] bg-white dark:bg-gray-800 flex shadow p-1 pl-2 pr-5"
        ref={ref}
      >
        {children}
      </header>
    );
  },
);

export const withSubAppHeader = (HOCComponent: () => JSX.Element) => {
  return ({ children }: { children: React.ReactNode }) => {
    const [measurerRef, { height, top }] = useMeasure<HTMLDivElement>();

    return (
      <>
        <div
          style={{
            paddingTop: `${height + top}px`,
          }}
        >
          {children}
        </div>
        <AppSubHeader ref={measurerRef}>
          <HOCComponent />
        </AppSubHeader>
      </>
    );
  };
};
