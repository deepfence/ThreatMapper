import {
  HiArrowSmRight,
  HiOutlineChevronRight,
  HiSwitchHorizontal,
} from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { Button, Card, Separator } from 'ui-components';

import { DagreGraph } from '@/features/vulnerabilities/components/landing/DagreGraph';

export const TopAttackPaths = () => {
  return (
    <Card className="p-2">
      <div className="flex flex-row items-center gap-x-2 pb-2">
        <IconContext.Provider
          value={{
            className: 'w-4 h-4 text-blue-700',
          }}
        >
          <HiSwitchHorizontal />
        </IconContext.Provider>
        <h4 className="text-base font-medium">Top Attack Paths</h4>
        <div className="flex ml-auto">
          <Button color="normal" size="xs">
            Go to ThreatGraph&nbsp;
            <HiOutlineChevronRight />
          </Button>
        </div>
      </div>
      <Separator />
      <div className="flex items-center justify-center max-h-[300px]">
        <DagreGraph />
      </div>
    </Card>
  );
};
