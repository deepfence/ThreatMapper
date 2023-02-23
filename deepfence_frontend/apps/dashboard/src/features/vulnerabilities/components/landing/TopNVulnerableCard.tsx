import { HiArrowSmRight } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { Card } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import {
  TopNVulnerableChart,
  TopNVulnerableChartData,
} from '@/features/vulnerabilities/components/landing/TopNVulnerableChart';
import { useTheme } from '@/theme/ThemeContext';

export const TopNVulnerableCard = ({
  data,
  loading,
  title,
  link,
}: {
  data: Array<TopNVulnerableChartData>;
  loading?: boolean;
  title: string;
  link: string;
}) => {
  const { mode } = useTheme();
  return (
    <Card className="w-full py-2 px-3 flex flex-col">
      <div className="flex">
        <h4 className="text-gray-900 text-md dark:text-white">{title}</h4>
        <DFLink
          to={link}
          className="flex items-center hover:no-underline active:no-underline focus:no-underline ml-auto mr-2"
        >
          <span className="text-xs text-blue-600 dark:text-blue-500">Go to Scans</span>
          <IconContext.Provider
            value={{
              className: 'text-blue-600 dark:text-blue-500 ',
            }}
          >
            <HiArrowSmRight />
          </IconContext.Provider>
        </DFLink>
      </div>
      <div className="basis-60">
        <TopNVulnerableChart theme={mode} data={data} loading={loading} />
      </div>
    </Card>
  );
};
