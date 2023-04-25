import { IconContext } from 'react-icons';
import { HiArrowRight, HiOutlineLightningBolt } from 'react-icons/hi';
import { Button, Card } from 'ui-components';

import { DFLink } from '@/components/DFLink';

export const ThreatStrykerBanner = () => {
  return (
    <div className="m-2">
      <Card className="p-2 bg-blue-100 dark:bg-blue-900">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex gap-2">
            <IconContext.Provider
              value={{
                className: 'h-5 w-5 text-blue-600 dark:text-blue-200',
              }}
            >
              <HiOutlineLightningBolt />
            </IconContext.Provider>
            <div className="text-sm text-ellipsis text-blue-600 dark:text-blue-200">
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
              <Button color="primary" size="xs">
                Grab ThreatStryker&nbsp;
                <HiArrowRight />
              </Button>
            </DFLink>
          </div>
        </div>
      </Card>
    </div>
  );
};
