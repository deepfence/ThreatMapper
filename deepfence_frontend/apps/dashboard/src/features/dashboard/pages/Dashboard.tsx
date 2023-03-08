import { useState } from 'react';
import { IconContext } from 'react-icons';
import {
  HiChip,
  HiClipboardList,
  HiClock,
  HiCloud,
  HiPhotograph,
  HiRefresh,
  HiServer,
  HiSupport,
  HiViewGrid,
} from 'react-icons/hi';
import { Card, Select, SelectItem, Typography } from 'ui-components';

import { Posture } from '@/features/dashboard/components/Posture';
import { RuntimeIncidents } from '@/features/dashboard/components/RuntimeIncidents';
import { TopAttackPaths } from '@/features/dashboard/components/TopAttackPath';
import { TopRisksVulnerability } from '@/features/dashboard/components/TopRisksVulnerability';

// import { Activity } from '../components/activity/Activity';
// import { AttackPath } from '../components/attack-paths/AttackPath';
// import { Posture } from '../components/posture/Posture';
// import { Registries } from '../components/registries/Registries';
// import { RuntimeIncidents } from '../components/runtime-incidents/RuntimeIncidents';
// import { TopRisks } from '../components/top-risks/TopRisks';

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

const IntervalIcon = () => {
  return (
    <div
      className={`${Typography.size.sm} ${Typography.weight.medium} flex items-center gap-2`}
    >
      Interval
      <HiClock />
    </div>
  );
};
const RefreshIcon = () => {
  return (
    <div
      className={`${Typography.size.sm} ${Typography.weight.medium} flex items-center gap-2`}
    >
      Refresh <HiRefresh />
    </div>
  );
};
export const Dashboard = () => {
  const [value, setValue] = useState<string | undefined>();
  return (
    <>
      <div className="grid grid-cols-[3fr_1fr] p-2 gap-2">
        <Card className="flex items-center py-1 gap-2">
          {COUNTS_DATA.map((data) => {
            return (
              <div
                className="p-1 border-r basis-full flex flex-col gap-1 cursor-pointer hover:bg-gray-100 first:pl-2"
                key={data.label}
              >
                <div
                  className={`${Typography.size.base} ${Typography.weight.bold} flex flex-col text-gray-800`}
                >
                  {data.icon}
                  <span className={`pl-1 ${Typography.size.lg}`}>{data.count}</span>
                </div>
                <div
                  className={`${Typography.size.xs} flex items-center text-gray-500 pl-1`}
                >
                  {data.label}
                </div>
              </div>
            );
          })}
        </Card>
        <Card className="flex flex-col px-8 py-1 justify-center gap-1">
          <Select
            value={value}
            name="fruit"
            onChange={(value) => {
              setValue(value);
            }}
            placeholder="30 seconds"
            sizing="xs"
            prefixComponent={<IntervalIcon />}
          >
            <SelectItem value="Apple" />
            <SelectItem value="Banana" />
            <SelectItem value="Grape" />
            <SelectItem value="Orange" />
            <SelectItem value="Papaya" />
            <SelectItem value="Watermalon" />
            <SelectItem value="Guava" />
            <SelectItem value="Tomato" />
            <SelectItem value="Blueberries" />
            <SelectItem value="Pear" />
            <SelectItem value="Pineapple" />
          </Select>
          <Select
            value={value}
            name="fruit"
            onChange={(value) => {
              setValue(value);
            }}
            placeholder="Last 30 Days"
            sizing="xs"
            prefixComponent={<RefreshIcon />}
          >
            <SelectItem value="Apple" />
            <SelectItem value="Banana" />
            <SelectItem value="Grape" />
            <SelectItem value="Orange" />
            <SelectItem value="Papaya" />
            <SelectItem value="Watermalon" />
            <SelectItem value="Guava" />
            <SelectItem value="Tomato" />
            <SelectItem value="Blueberries" />
            <SelectItem value="Pear" />
            <SelectItem value="Pineapple" />
          </Select>
        </Card>
      </div>
      <div className="grid grid-cols-[35%_1fr_35%] gap-2 auto-rows-[minmax(300px,_auto)] px-2">
        <TopAttackPaths />
        <Posture />
        <RuntimeIncidents />
        {/* <Registries /> */}
        <TopRisksVulnerability />
        {/* <Activity /> */}
        {/* <RuntimeIncidents /> */}
      </div>
    </>
  );
};
