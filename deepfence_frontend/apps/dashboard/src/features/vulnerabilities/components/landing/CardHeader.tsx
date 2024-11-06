import React, { ReactNode } from 'react';
import { Tooltip } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { InfoStandardIcon } from '@/components/icons/common/InfoStandard';
import { TruncatedText } from '@/components/TruncatedText';

export const CardHeader = ({
  icon,
  path,
  title,
  infoText,
}: {
  icon: ReactNode;
  title: string;
  path?: string;
  infoText?: React.ReactNode;
}) => {
  return (
    <div className="flex items-center gap-2 text-text-text-and-icon border-b dark:border-df-gray-900 border-bg-grid-border px-2 py-3">
      <span className="h-4 w-4 shrink-0">{icon}</span>
      <div className="flex flex-1 items-center gap-2">
        <div>
          <TruncatedText className="text-t2 uppercase truncate" text={title} />
        </div>
        {infoText ? (
          <Tooltip content={infoText}>
            <div className="h-4 w-4">
              <InfoStandardIcon />
            </div>
          </Tooltip>
        ) : null}
      </div>
      {path && (
        <DFLink to={path}>
          <div className="text-p4 leading-0 flex gap-x-1 items-center">
            More
            <div className="h-4 w-4 shrink-0 -rotate-90 justify-self-end -mr-1 hover:underline">
              <CaretDown />
            </div>
          </div>
        </DFLink>
      )}
    </div>
  );
};
