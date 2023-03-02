import cx from 'classnames';
import { IconContext } from 'react-icons';
import { HiArrowSmRight } from 'react-icons/hi';
import { Card } from 'ui-components';

import LogoAws from '@/assets/logo-aws.svg';
import LogoAwsWhite from '@/assets/logo-aws-white.svg';
import LogoAzure from '@/assets/logo-azure.svg';
import LogoGoogle from '@/assets/logo-google.svg';
import LogoK8 from '@/assets/logo-k8.svg';
import LogoLinux from '@/assets/logo-linux.svg';
import { DFLink } from '@/components/DFLink';
import { Mode, useTheme } from '@/theme/ThemeContext';

const logoMap = (accountType: string, mode: Mode) => {
  const map = {
    aws: {
      label: 'AWS',
      icon: mode === 'dark' ? LogoAwsWhite : LogoAws,
    },
    azure: {
      label: 'Azure',
      icon: LogoGoogle,
    },
    gcp: {
      label: 'GCP',
      icon: LogoAzure,
    },
    kubernetes: {
      label: 'KUBERNETES',
      icon: LogoK8,
    },
    host: {
      label: 'HOSTS',
      icon: LogoLinux,
    },
  };
  return map[accountType];
};

const AccountSummary = () => {
  const { mode } = useTheme();
  return (
    <>
      {[
        {
          id: 'aws',
          name: 'AWS',
          totalAccounts: 14,
          totalResources: 99,
          totalScans: 23,
          compliancePercentage: 13,
        },
        {
          id: 'aws',
          name: 'AWS ORG ID',
          totalAccounts: 200,
          totalResources: 0,
          totalScans: 0,
          compliancePercentage: 0,
        },
        {
          id: 'azure',
          name: 'AZURE',
          totalAccounts: 4,
          totalResources: 34,
          totalScans: 30,
          compliancePercentage: 35,
        },
        {
          id: 'gcp',
          name: 'GCP',
          totalAccounts: 32,
          totalResources: 23,
          totalScans: 40,
          compliancePercentage: 76,
        },
        {
          id: 'kubernetes',
          name: 'Kubernetes',
          totalAccounts: 11,
          totalResources: 200,
          totalScans: 76,
          compliancePercentage: 40,
        },
        {
          id: 'host',
          name: 'Hosts',
          totalAccounts: 5,
          totalResources: 700,
          totalScans: 200,
          compliancePercentage: 90,
        },
      ].map((cloud) => {
        const {
          id,
          name,
          totalAccounts,
          totalResources,
          totalScans,
          compliancePercentage,
        } = cloud;
        const account = logoMap(id, mode);
        return (
          <Card key={name} className="p-4 flex flex-col gap-y-1">
            <div className="flex items-center justify-between w-full">
              <h4 className="text-gray-900 text-sm dark:text-white mr-4">{name}</h4>
              <div className="ml-auto">
                <DFLink
                  to={`/posture/accounts/${id}`}
                  className="flex items-center hover:no-underline"
                >
                  <span className="text-xs text-blue-600 dark:text-blue-500">
                    Go to details
                  </span>
                  <IconContext.Provider
                    value={{
                      className: 'text-blue-600 dark:text-blue-500 ',
                    }}
                  >
                    <HiArrowSmRight />
                  </IconContext.Provider>
                </DFLink>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-x-6">
              <div className="pr-2 flex flex-col gap-y-2 border-r border-gray-200 dark:border-gray-700">
                <img src={account.icon} alt="logo" width={40} height={40} />
                <div className="flex flex-col gap-x-4">
                  <span
                    className={cx('text-md rounded-lg px-1 font-medium w-fit', {
                      'bg-[#de425b]/30 dark:bg-[#de425b]/20 text-[#de425b] dark:text-[#de425b]':
                        compliancePercentage > 60 && compliancePercentage < 100,
                      'bg-[#ffd577]/30 dark:bg-[##ffd577]/10 text-yellow-400 dark:text-[#ffd577]':
                        compliancePercentage > 30 && compliancePercentage < 90,
                      'bg-[#0E9F6E]/20 dark:bg-[#0E9F6E]/20 text-[#0E9F6E] dark:text-[#0E9F6E]':
                        compliancePercentage !== 0 && compliancePercentage < 30,
                      'text-gray-700 dark:text-gray-400': !compliancePercentage,
                    })}
                  >
                    {compliancePercentage}%
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Compliance
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg text-gray-900 dark:text-gray-200 font-light">
                  {totalAccounts}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {id === 'host' ? 'Hosts' : 'Accounts'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg text-gray-900 dark:text-gray-200 font-light">
                  {totalResources}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Resources
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-lg text-gray-900 dark:text-gray-200 font-light">
                  {totalScans}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">Scans</span>
              </div>
            </div>
          </Card>
        );
      })}
    </>
  );
};

const Posture = () => {
  return (
    <>
      <div className="flex p-2 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
        <span className="text-md font-medium text-gray-700 dark:text-gray-200 uppercase">
          Posture
        </span>
      </div>
      <div className="p-4 flex flex-row flex-wrap gap-4">
        <AccountSummary />
      </div>
    </>
  );
};

export const module = {
  element: <Posture />,
};
