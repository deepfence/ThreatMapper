import { Suspense } from 'react';

type LazylayoutProps = {
  children: React.ReactNode;
};
export const LazyLayout = ({ children }: LazylayoutProps) => {
  return (
    <Suspense
      fallback={<div className="h-full w-full flex items-center justify-center">...</div>}
    >
      {children}
    </Suspense>
  );
};
