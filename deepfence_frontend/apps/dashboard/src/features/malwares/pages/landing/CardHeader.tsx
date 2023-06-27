import { ReactNode } from 'react';

import { DFLink } from '@/components/DFLink';

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
    <div className="border-b dark:border-df-gray-900">
      <DFLink to={path} unstyled>
        <div className="flex items-center gap-2 dark:text-accent-accent dark:hover:text-bg-hover-1 p-3">
          <span className="h-4 w-4 shrink-0">{icon}</span>
          <span className="text-t2 uppercase truncate" title={title}>
            {title}
          </span>
        </div>
      </DFLink>
    </div>
  );
};
