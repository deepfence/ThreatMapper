import cx from 'classnames';
import { IconContext } from 'react-icons';
import {
  HiChip,
  HiClipboardList,
  HiCloud,
  HiPhotograph,
  HiServer,
  HiSupport,
  HiViewGrid,
} from 'react-icons/hi';
import { Card } from 'ui-components';

import { Posture } from '@/features/dashboard/components/Posture';
import { Registries } from '@/features/dashboard/components/Registries';
import { RuntimeIncidents } from '@/features/dashboard/components/RuntimeIncidents';
import { TopAttackPaths } from '@/features/dashboard/components/TopAttackPath';
import { TopRisksMalware } from '@/features/dashboard/components/TopRisksMalware';
import { TopRisksSecret } from '@/features/dashboard/components/TopRisksSecret';
import { TopRisksVulnerability } from '@/features/dashboard/components/TopRisksVulnerability';

const COUNTS_DATA = [
  {
    label: 'Cloud Providers',
    count: 7,
    icon: (
      <IconContext.Provider
        value={{
          className: 'w-6 h-6 p-1 text-gray-600 dark:text-white cursor-pointer',
          color: '#1C64F2',
        }}
      >
        <HiCloud />
      </IconContext.Provider>
    ),
  },
  {
    label: 'Containers',
    count: 50,
    icon: (
      <IconContext.Provider
        value={{
          className: 'w-6 h-6 p-1 text-gray-600 dark:text-white cursor-pointer',
          color: '#202020',
        }}
      >
        <HiChip />
      </IconContext.Provider>
    ),
  },
  {
    label: 'Container Images',
    count: 52,
    icon: (
      <IconContext.Provider
        value={{
          className: 'w-6 h-6 p-1 text-gray-600 dark:text-white cursor-pointer',
          color: '#E3A008',
        }}
      >
        <HiPhotograph />
      </IconContext.Provider>
    ),
  },
  {
    label: 'Hosts',
    count: 8,
    icon: (
      <IconContext.Provider
        value={{
          className: 'w-6 h-6 p-1 text-gray-600 dark:text-white cursor-pointer',
          color: '#057A55',
        }}
      >
        <HiServer />
      </IconContext.Provider>
    ),
  },
  {
    label: 'Kubernets',
    count: 3,
    icon: (
      <IconContext.Provider
        value={{
          className: 'w-6 h-6 p-1 text-gray-600 dark:text-white cursor-pointer',
          color: '#D61F69',
        }}
      >
        <HiSupport />
      </IconContext.Provider>
    ),
  },
  {
    label: 'Namespaces',
    count: 2,
    icon: (
      <IconContext.Provider
        value={{
          className: 'w-6 h-6 p-1 text-gray-600 dark:text-white cursor-pointer',
          color: '#047481',
        }}
      >
        <HiClipboardList />
      </IconContext.Provider>
    ),
  },
  {
    label: 'Pods',
    count: 10,
    icon: (
      <IconContext.Provider
        value={{
          className: 'w-6 h-6 p-1 text-gray-600 dark:text-white cursor-pointer',
          color: '#E02424',
        }}
      >
        <HiViewGrid />
      </IconContext.Provider>
    ),
  },
];
export const Dashboard = () => {
  return (
    <div className="overflow-auto">
      <div className="grid grid-cols-[3fr_1fr] p-2 gap-2">
        <Card className="flex items-center gap-2">
          {COUNTS_DATA.map((data, index) => {
            return (
              <div
                key={data.label}
                className="py-2 basis-full flex flex-col h-full cursor-pointer hover:bg-gray-50 hover:dark:bg-gray-700/20 pl-2 justify-center"
              >
                <div
                  className={cx('border-r dark:border-gray-700 pr-4 ', {
                    'border-none': index === COUNTS_DATA.length - 1,
                  })}
                >
                  <div className="font-light flex text-gray-700 dark:text-white items-center">
                    {data.icon}
                    <span className="pl-1 text-[1.5rem]">{data.count}</span>
                  </div>
                  <div className="text-xs flex items-center text-gray-400 dark:text-gray-500 pl-1">
                    {data.label}
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
      <div className="grid grid-cols-2 2xl:grid-cols-3 gap-2 auto-rows-auto px-2 last:mb-2">
        <TopAttackPaths />
        <Posture />
        <TopRisksVulnerability />
        <TopRisksSecret />
        <TopRisksMalware />
        <Registries />
        <RuntimeIncidents />
      </div>
    </div>
  );
};
