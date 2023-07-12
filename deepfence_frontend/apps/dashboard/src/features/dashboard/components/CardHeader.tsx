import { ReactNode } from 'react';

import { DFLink } from '@/components/DFLink';

export const CardHeader = ({
  icon,
  title,
  link,
}: {
  icon: ReactNode;
  title: string;
  link?: string;
}) => {
  const Wrapper = ({ children }: { children: ReactNode }) => {
    if (link?.length) {
      return (
        <DFLink
          to={link}
          unstyled
          className="p-3 flex items-center gap-2 dark:text-text-text-and-icon dark:hover:text-accent-accent border-b dark:border-df-gray-900"
        >
          {children}
        </DFLink>
      );
    }
    return (
      <div className="p-3 flex items-center gap-2 dark:text-text-text-and-icon border-b dark:border-df-gray-900">
        {children}
      </div>
    );
  };

  return (
    <Wrapper>
      <div className="w-4 h-4 shrink-0">{icon}</div>
      <div className="text-t2 uppercase">{title}</div>
    </Wrapper>
  );
};
