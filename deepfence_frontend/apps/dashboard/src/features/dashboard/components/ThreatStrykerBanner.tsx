import { IconContext } from 'react-icons';
import { HiArrowRight, HiOutlineLightningBolt } from 'react-icons/hi';
import { Card } from 'ui-components';

import { DFLink } from '@/components/DFLink';

export const ThreatStrykerBanner = () => {
  return (
    <div className="m-2">
      <Card className="px-2 py-1 bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-700">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex gap-2">
            <IconContext.Provider
              value={{
                className: 'h-4 w-4 text-blue-600 dark:text-blue-200',
              }}
            >
              <HiOutlineLightningBolt />
            </IconContext.Provider>
            <div className="text-sm leading-tight text-ellipsis text-blue-600 dark:text-blue-200">
              Extend ThreatMapper with runtime attack analysis, threat assessment, and
              targeted protection for your applications. Scalable, supported, and ready
              for action!
            </div>
          </div>
          <div>
            <DFLink
              href="https://deepfence.io/threatstryker/"
              target="_blank"
              className="no-underline hover:no-underline active:no-underline"
            >
              <button className="flex items-center bg-[linear-gradient(to_right,#2196f3_0%,#f44336_51%,#2196f3_100%)] text-center text-xs font-semibold duration-1000 bg-[200%_auto] text-[white] px-3 py-1 rounded-md hover:bg-[right_center] hover:text-white hover:no-underline">
                Grab ThreatStryker&nbsp;
                <HiArrowRight />
              </button>
            </DFLink>
          </div>
        </div>
      </Card>
    </div>
  );
};
