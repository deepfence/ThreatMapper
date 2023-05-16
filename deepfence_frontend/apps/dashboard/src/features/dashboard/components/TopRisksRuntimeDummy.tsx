import { IconContext } from 'react-icons';
import { HiArrowRight, HiOutlineExclamation } from 'react-icons/hi';
import { Card, Separator } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { TopRisksCardContent } from '@/features/dashboard/components/top-risks/TopRisksCardContent';

export const TopRisksRuntimeDummy = () => {
  return (
    <Card className="flex flex-col">
      <div className="flex flex-row items-center gap-x-2 p-2">
        <div className="w-5 h-5 text-blue-700 dark:text-blue-300">
          <IconContext.Provider
            value={{
              className: 'h-5 w-5',
            }}
          >
            <HiOutlineExclamation />
          </IconContext.Provider>
        </div>
        <h4 className="text-base font-medium">Runtime Incidents</h4>
      </div>
      <Separator />
      <div className="relative flex-1">
        <TopRisksCardContent
          data={{
            severityBreakdown: {
              high: 1000,
              medium: 3000,
              critical: 1000,
              low: 1000,
              unknown: 0,
            },
            total: 6000,
            top5Assets: [
              {
                nodeName: 'xxxxx-xxxxxx-xxxxxx-xxxxx1',
                high: 100,
                medium: 100,
                critical: 100,
                low: 100,
                unknown: 0,
                total: 500,
              },
              {
                nodeName: 'xxxxx-xxxxxx-xxxxxx-xxxxx2',
                high: 100,
                medium: 100,
                critical: 100,
                low: 100,
                unknown: 0,
                total: 500,
              },
              {
                nodeName: 'xxxxx-xxxxxx-xxxxxx-xxxxx2',
                high: 100,
                medium: 100,
                critical: 100,
                low: 100,
                unknown: 0,
                total: 500,
              },
              {
                nodeName: 'xxxxx-xxxxxx-xxxxxx-xxxxx2',
                high: 100,
                medium: 100,
                critical: 100,
                low: 100,
                unknown: 0,
                total: 500,
              },
              {
                nodeName: 'xxxxx-xxxxxx-xxxxxx-xxxxx2',
                high: 100,
                medium: 100,
                critical: 100,
                low: 100,
                unknown: 0,
                total: 500,
              },
            ],
          }}
        />
        <div className="absolute inset-0 backdrop-blur-md bg-white/30 dark:bg-blue-900/30 flex flex-col items-center justify-center">
          <div className="text-center p-6">
            Extend ThreatMapper with runtime attack analysis, threat assessment, and
            targeted protection for your applications. Scalable, supported, and ready for
            action!
          </div>
          <div>
            <DFLink
              href="https://deepfence.io/threatstryker/"
              target="_blank"
              className="no-underline hover:no-underline active:no-underline"
            >
              <button className="flex gap-1 items-center bg-[linear-gradient(to_right,#2196f3_0%,#f44336_51%,#2196f3_100%)] text-center text-sm font-semibold duration-1000 bg-[200%_auto] text-[white] px-4 py-2 rounded-md hover:bg-[right_center] hover:text-white hover:no-underline">
                Grab ThreatStryker&nbsp;
                <HiArrowRight />
              </button>
            </DFLink>
          </div>
        </div>
      </div>
    </Card>
  );
};
