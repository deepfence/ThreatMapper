import React from 'react';
import { useMeasure } from 'react-use';

import { useSideNavContext } from '@/components/SideNavigation';

export const AppSubHeader = ({ children }: { children: React.ReactNode }) => {
  const [measurerRef, obj] = useMeasure<HTMLDivElement>();
  const { navWidth } = useSideNavContext();

  return (
    <>
      <div
        style={{
          height: `${obj.height + obj.top}px`,
        }}
      />
      <header
        className="fixed w-full top-[64px] bg-white dark:bg-gray-800 flex shadow p-1 pl-2"
        style={{
          width: `calc(100% - ${navWidth}px)`,
          // transitionProperty: 'width',
          // transitionDuration: '0.3s',
          // transitionDelay: '0s',
          // transition: 'width -1s ease linear',
          // transition: 'flex 0.1s ease-out',
          transition: 'width transform 0.3s ease-out',
          transformOrigin: 'left',
          transform: 'scaleX(1)',
        }}
        ref={measurerRef}
      >
        {children}
      </header>
    </>
  );
};
