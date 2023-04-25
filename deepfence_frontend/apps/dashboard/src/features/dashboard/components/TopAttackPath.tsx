import { HiOutlineChevronRight } from 'react-icons/hi';
import { Card, Separator } from 'ui-components';

import { LinkButton } from '@/components/LinkButton';
import { ThreatGraphIcon } from '@/components/sideNavigation/icons/ThreatGraph';
import { ThreatGraphComponent } from '@/features/threat-graph/components/ThreatGraph';

export const TopAttackPaths = () => {
  return (
    <Card className="p-2">
      <div className="flex flex-row items-center gap-x-2 pb-2">
        <div className="w-5 h-5 text-blue-700 dark:text-blue-300">
          <ThreatGraphIcon />
        </div>
        <h4 className="text-base font-medium">Top Attack Paths</h4>
        <div className="flex ml-auto">
          <LinkButton to={'/threatgraph'} sizing="xs">
            <>
              Go to ThreatGraph&nbsp;
              <HiOutlineChevronRight />
            </>
          </LinkButton>
        </div>
      </div>
      <Separator />
      <div className="flex items-center justify-center h-[380px]">
        <ThreatGraphComponent />
      </div>
    </Card>
  );
};
