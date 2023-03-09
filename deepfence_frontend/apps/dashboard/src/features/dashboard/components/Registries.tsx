import cx from 'classnames';
import { IconContext } from 'react-icons';
import { HiOutlineChevronRight, HiViewGrid } from 'react-icons/hi';
import { Button, Card, Separator } from 'ui-components';

import LogoAws from '@/assets/logo-aws.svg';
import LogoAwsWhite from '@/assets/logo-aws-white.svg';
import LogoAzure from '@/assets/logo-azure.svg';
import LogoDocker from '@/assets/logo-docker.svg';
import LogoGitlab from '@/assets/logo-gitlab.svg';
import LogoGoogle from '@/assets/logo-google.svg';
import LogoHarbor from '@/assets/logo-harbor.svg';
import LogoJfrog from '@/assets/logo-jfrog.svg';
import LogoQuay from '@/assets/logo-quay.svg';
import { Mode, useTheme } from '@/theme/ThemeContext';

const color_low = '#0080ff';

const getIcon = (theme: Mode): { [k: string]: string } => {
  return {
    aws: theme === 'dark' ? LogoAwsWhite : LogoAws,
    azure: LogoAzure,
    gcp: LogoGoogle,
    docker: LogoDocker,
    harbor: LogoHarbor,
    jfrog: LogoJfrog,
    gitlab: LogoGitlab,
    quay: LogoQuay,
  };
};

const CONNECTORS = [
  {
    label: 'AWS',
    id: 'aws',
    percent: '93%',
    accounts: 6,
    color: color_low,
  },
  {
    label: 'GCP',
    id: 'gcp',
    percent: '93%',
    accounts: 6,
    color: color_low,
  },
  {
    label: 'Azure',
    id: 'azure',
    percent: '93%',
    accounts: 6,
    color: color_low,
  },
  {
    label: 'Quay',
    id: 'quay',
    percent: '93%',
    accounts: 6,
    color: color_low,
  },
  {
    label: 'Docker',
    id: 'docker',
    percent: '93%',
    accounts: 6,
    color: color_low,
  },
  {
    label: 'Docker Hub',
    id: 'docker',
    percent: '93%',
    accounts: 6,
    color: color_low,
  },
  {
    label: 'Harbor',
    id: 'harbor',
    percent: '93%',
    accounts: 6,
    color: color_low,
  },
  {
    label: 'GitLab',
    id: 'gitlab',
    percent: '93%',
    accounts: 6,
    color: color_low,
  },
  {
    label: 'JFrog',
    id: 'jfrog',
    percent: '93%',
    accounts: 6,
    color: color_low,
  },
];

export const Registries = () => {
  const { mode } = useTheme();
  return (
    <Card className="p-2">
      <div className="flex flex-row items-center gap-2 pb-2">
        <IconContext.Provider
          value={{
            className: 'w-4 h-4 text-blue-700',
          }}
        >
          <HiViewGrid />
        </IconContext.Provider>
        <span className="text-base font-medium">Registries</span>
        <div className="flex ml-auto">
          <Button color="normal" size="xs">
            More&nbsp;
            <HiOutlineChevronRight />
          </Button>
        </div>
      </div>
      <Separator />
      <div className="mt-4 grid grid-cols-3 gap-4">
        {CONNECTORS.map((connector) => {
          return (
            <div
              className={cx('flex flex-col gap-x-6 w-full pl-4 py-4')}
              key={connector.label}
            >
              <h4 className="text-md text-gray-500 dark:text-gray-400">
                {connector.label}
              </h4>
              <div className="flex items-center gap-x-4">
                <div className="p-4 pl-0 flex w-14 h-14">
                  <img src={getIcon(mode)[connector.id]} alt="Deefence Logo" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[1.5rem] text-gray-900 dark:text-gray-200 font-light">
                    {connector.accounts}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Registries
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
