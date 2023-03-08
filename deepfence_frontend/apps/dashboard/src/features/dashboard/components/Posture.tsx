import { HiOutlineChevronRight } from 'react-icons/hi';
import { Button, Card, Separator, Typography } from 'ui-components';

import { PostureIcon } from '@/components/sideNavigation/icons/Posture';

const color_low = '#0080ff';

const CONNECTORS = [
  {
    label: 'AWS',
    percent: '93%',
    accounts: 6,
    color: color_low,
  },
  {
    label: 'GCP',
    percent: '93%',
    accounts: 6,
    color: color_low,
  },
  {
    label: 'Azure',
    percent: '93%',
    accounts: 6,
    color: color_low,
  },
  {
    label: 'Kubernetes',
    percent: '93%',
    accounts: 6,
    color: color_low,
  },
  {
    label: 'Linux Host',
    percent: '93%',
    accounts: 6,
    color: color_low,
  },
];

export const Posture = () => {
  return (
    <Card className="p-2">
      <div className="flex flex-row items-center gap-2 pb-2">
        <div className="w-4 h-4 text-blue-700">
          <PostureIcon />
        </div>
        <h4 className="text-base font-medium">Posture</h4>
        <div className="flex ml-auto">
          <Button color="normal" size="xs">
            More&nbsp;
            <HiOutlineChevronRight />
          </Button>
        </div>
      </div>
      <Separator />
      <div className="mt-4 grid grid-cols-[repeat(auto-fill,_minmax(30%,_1fr))] gap-x-2 gap-y-4 place-items-center divide-x">
        {CONNECTORS.map((connector) => {
          return (
            <div key={connector.label} className={`flex flex-col pl-8 w-full`}>
              <span className={`${Typography.size.base} ${Typography.weight.medium}`}>
                {connector.label}
              </span>
              <span className={`${Typography.size.sm} text-gray-500`}>Compliance</span>
              <span className={`${Typography.size.lg} ${Typography.weight.medium} mt-2`}>
                {connector.percent}
              </span>
              <span className={`${Typography.size.sm} text-blue-500 cursor-pointer`}>
                {connector.accounts} accounts
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
