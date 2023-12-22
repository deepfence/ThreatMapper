import { ReactNode } from 'react';

import { DFLink } from '@/components/DFLink';
import { CaretDown } from '@/components/icons/common/CaretDown';

export const CardHeader = ({
  icon,
  path,
  title,
}: {
  icon: ReactNode;
  title: string;
  path: string;
}) => {
  return (
    <DFLink to={path} unstyled>
      <div className="flex items-center gap-2 dark:text-text-text-and-icon text-accent-accent hover:text-accent-accent border-b dark:border-df-gray-900 border-df-gray-100 px-2 py-3">
        <span className="h-4 w-4 shrink-0">{icon}</span>
        <span className="text-t2 uppercase truncate flex-1" title={title}>
          {title}
        </span>
        <div className="h-4 w-4 shrink-0 -rotate-90 justify-self-end">
          <CaretDown />
        </div>
      </div>
    </DFLink>
  );
};
