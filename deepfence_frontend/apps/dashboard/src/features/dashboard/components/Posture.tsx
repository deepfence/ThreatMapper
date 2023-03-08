import { HiOutlineChevronRight } from 'react-icons/hi';
import { Button, Card, Separator } from 'ui-components';

import LogoAws from '@/assets/logo-aws.svg';
import LogoAwsWhite from '@/assets/logo-aws-white.svg';
import LogoAzure from '@/assets/logo-azure.svg';
import LogoGoogle from '@/assets/logo-google.svg';
import LogoK8 from '@/assets/logo-k8.svg';
import LogoLinux from '@/assets/logo-linux.svg';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { Mode, useTheme } from '@/theme/ThemeContext';

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

const getIcon = (theme: Mode): { [k: string]: string } => {
  return {
    aws: theme === 'dark' ? LogoAwsWhite : LogoAws,
    azure: LogoAzure,
    gcp: LogoGoogle,
    kubernetes: LogoK8,
    'linux host': LogoLinux,
  };
};

export const Posture = () => {
  const { mode } = useTheme();
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
      <div className="mt-4 grid grid-cols-[repeat(auto-fill,_minmax(40%,_1fr))] gap-2 place-items-center [&>*:nth-child(3n)]:border-0">
        {CONNECTORS.map((connector) => {
          return (
            <div key={connector.label} className="p-4 flex flex-col shrink-0 gap-y-1">
              <div
                className="flex flex-col gap-x-6 border-r border-b border-gray-100 dark:border-gray-700 w-full"
                key={connector.label}
              >
                <h4 className="text-gray-900 text-md dark:text-white mr-4">
                  {connector.label}
                </h4>
                <div className="flex items-center justify-center gap-x-4">
                  <div className="p-4 flex w-16 h-16">
                    <img src={getIcon(mode)[connector.label.toLowerCase()]} alt="logo" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[1.5rem] text-gray-900 dark:text-gray-200 font-light">
                      {connector.accounts}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Accounts
                    </span>
                  </div>
                  <div className="flex flex-col gap-x-4">
                    <span className="text-[1.5rem] text-gray-900 dark:text-gray-200 font-light">
                      {connector.percent}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Compliance
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
