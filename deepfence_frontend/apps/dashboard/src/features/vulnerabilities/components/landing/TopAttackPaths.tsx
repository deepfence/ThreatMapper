import { HiOutlineChevronRight } from 'react-icons/hi';
import { Button, Card, Separator, Tabs } from 'ui-components';

import { DagreGraph } from '@/features/vulnerabilities/components/landing/DagreGraph';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const attackPathTabs: Array<{
  label: string;
  value: string;
}> = [
  {
    label: 'Most attack paths',
    value: 'most',
  },
  {
    label: 'Direct internet exposure',
    value: 'direct',
  },
  {
    label: 'Indirect internet exposure',
    value: 'indirect',
  },
];

export const TopAttackPaths = () => {
  const { navigate } = usePageNavigation();
  return (
    <Card className="h-full p-2">
      <div className="flex items-center pb-2">
        <h4 className="text-gray-900 font-medium text-base dark:text-white">
          Top Attack Paths
        </h4>
        <div className="flex ml-auto">
          <Button
            color="normal"
            size="xs"
            onClick={(e) => {
              e.preventDefault();
              navigate('/vulnerability/scans');
            }}
          >
            Go to ThreatGraph&nbsp;
            <HiOutlineChevronRight />
          </Button>
        </div>
      </div>
      <Separator />
      <div className="flex items-center justify-center pt-2">
        <div className="text-gray-600 dark:text-gray-400 flex items-center justify-center h-[300px]">
          Coming Soon!
        </div>
        {/* <Tabs value={'most'} tabs={attackPathTabs} size="xs" variant="tab">
          <DagreGraph />
        </Tabs> */}
      </div>
    </Card>
  );
};
