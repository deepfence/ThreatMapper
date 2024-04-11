import { ReactNode } from 'react';

import { DFLink } from '@/components/DFLink';
import { CaretDown } from '@/components/icons/common/CaretDown';

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
          className="p-3 flex items-center text-text-text-and-icon hover:text-accent-accent border-b dark:border-df-gray-900 border-bg-grid-border"
        >
          <span className="flex-1 truncate flex items-center gap-2">{children}</span>
          <div className="h-4 w-4 shrink-0 -rotate-90 justify-self-end">
            <CaretDown />
          </div>
        </DFLink>
      );
    }
    return (
      <div className="p-3 flex items-center gap-2 text-text-text-and-icon border-b dark:border-df-gray-900 border-bg-grid-border">
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
