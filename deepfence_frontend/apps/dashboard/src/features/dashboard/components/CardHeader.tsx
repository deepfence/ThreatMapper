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
        <div
          className="p-3 flex items-center text-text-text-and-icon border-b dark:border-df-gray-900 border-bg-grid-border"
          data-testid={`${title}Id`}
        >
          <span className="flex-1 truncate flex items-center gap-2">{children}</span>
          <DFLink to={link}>
            <div className="text-p4 leading-0 flex gap-x-1 items-center">
              More
              <div className="h-4 w-4 shrink-0 -rotate-90 justify-self-end -mr-1 hover:underline">
                <CaretDown />
              </div>
            </div>
          </DFLink>
        </div>
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
