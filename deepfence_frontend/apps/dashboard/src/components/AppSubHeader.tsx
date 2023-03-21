import React from 'react';
import { useMeasure } from 'react-use';

export const AppSubHeader = ({ children }: { children: React.ReactNode }) => {
  const [measurerRef, obj] = useMeasure<HTMLDivElement>();
  return (
    <>
      <div
        style={{
          height: `${obj.height + obj.top}px`,
        }}
      />
      <header
        className="fixed w-full top-[64px] bg-white dark:bg-gray-800 flex shadow p-1 pl-2 pr-5"
        ref={measurerRef}
      >
        {children}
      </header>
    </>
  );
};
