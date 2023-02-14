import { HiArrowSmRight } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { Card, Tabs } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { DagreGraph } from '@/features/vulnerabilities/components/landing/DagreGraph';

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
  return (
    <Card className="min-h-[100px] p-2 grid grid-flow-row">
      <div className="p-2 flex items-center">
        <h4 className="text-gray-900 text-sm dark:text-white">Top Attack Paths</h4>
        <DFLink to={'/'} className="flex items-center hover:no-underline ml-auto mr-2">
          <span className="text-xs text-blue-600 dark:text-blue-500">Details</span>
          <IconContext.Provider
            value={{
              className: 'text-blue-600 dark:text-blue-500 ',
            }}
          >
            <HiArrowSmRight />
          </IconContext.Provider>
        </DFLink>
      </div>
      <div className="flex items-center justify-center pt-2">
        <Tabs value={'most'} tabs={attackPathTabs} size="xs" variant="tab">
          <DagreGraph />
        </Tabs>
      </div>
    </Card>
  );
};
