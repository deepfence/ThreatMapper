import cx from 'classnames';
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
      <div className="mt-4 grid grid-cols-2 gap-y-4 [&>*:nth-child(2n)]:border-r-0">
        {CONNECTORS.map((connector, index) => {
          return (
            <div
              key={connector.label}
              className={cx(
                'flex w-full flex-cols gap-y-1 pl-4 border-r border-b border-gray-100 dark:border-gray-700',
                {
                  'border-b-0': index >= 4,
                },
              )}
            >
              <div className="flex flex-col py-4">
                <h4 className="text-gray-400 dark:text-gray-500 text-md font-normal">
                  {connector.label}
                </h4>
                <div className="flex items-center">
                  <div className="p-4 pl-0 flex w-14 h-14">
                    <img src={getIcon(mode)[connector.label.toLowerCase()]} alt="logo" />
                  </div>
                  <div className="flex gap-x-6">
                    <div className="flex flex-col">
                      <span className="text-[1.5rem] text-gray-900 dark:text-gray-200 font-light">
                        {connector.accounts}
                      </span>
                      <span className="text-xs text-gray-500">Accounts</span>
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
            </div>
          );
        })}
      </div>
    </Card>
  );
};
