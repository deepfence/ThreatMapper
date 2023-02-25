import { EChartsOption } from 'echarts';
import { capitalize } from 'lodash-es';
import { IconContext } from 'react-icons';
import { HiArrowSmRight } from 'react-icons/hi';
import { Card, CircleSpinner } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { ReactECharts } from '@/components/ReactEcharts';
import { VULNERABILITY_SEVERITY_COLORS } from '@/constants/charts';
import { Mode, useTheme } from '@/theme/ThemeContext';
import { VulnerabilitySeverityType } from '@/types/common';
import { getObjectKeys } from '@/utils/array';

type ChartData = Array<{
  label: string;
  value: number;
}>;

const MostExploitableChartVertial = ({
  theme,
  data,
}: {
  theme: Mode;
  data: ChartData;
}) => {
  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
    },
    legend: {
      show: false,
    },
    dataset: {
      source: data,
    },
    series: [
      {
        name: 'Vulnerabilities',
        type: 'pie',
        radius: ['85%', '100%'],
        top: '10%',
        avoidLabelOverlap: true,
        label: {
          show: false,
          position: 'center',
        },
      },
    ],
  };
  return <ReactECharts theme={theme === 'dark' ? 'dark' : 'light'} option={option} />;
};

export interface VulnerabilitiesCountsCardData {
  total: number;
  severityBreakdown: {
    [x in VulnerabilitySeverityType]: number;
  };
}

const LoadingComponent = () => {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <CircleSpinner size="xl" />
    </div>
  );
};

export const VulnerabilitiesCountsCard = ({
  title,
  data,
  loading,
}: {
  title: string;
  data?: VulnerabilitiesCountsCardData;
  loading: boolean;
}) => {
  const { mode } = useTheme();
  return (
    <Card className="flex h-full p-2 flex-col">
      <div className="p-2 flex">
        <h4 className="text-gray-900 text-sm dark:text-white truncate">{title}</h4>
        <DFLink
          to={'/vulnerability/most-exploitable'}
          className="shrink-0 flex hover:no-underline ml-auto mr-2"
        >
          <span className="text-xs text-blue-600 dark:text-blue-500">Details</span>
          <IconContext.Provider
            value={{
              className: 'text-blue-600 dark:text-blue-500',
            }}
          >
            <HiArrowSmRight />
          </IconContext.Provider>
        </DFLink>
      </div>
      {loading && <LoadingComponent />}
      {data && !loading && (
        <div className="flex flex-col gap-2 items-center justify-center relative">
          <div className="flex-1 basis-[250px] p-4 self-stretch max-w-full">
            <MostExploitableChartVertial
              theme={mode}
              data={getObjectKeys(data.severityBreakdown).map((severity) => {
                return {
                  label: capitalize(severity),
                  value: data.severityBreakdown[severity],
                };
              })}
            />
          </div>
          <div className="flex-1 pt-4">
            <div className="flex flex-col align-center justify-center">
              <div className="text-[2.5rem] text-gray-900 dark:text-gray-200 font-light text-center">
                {data.total}
              </div>
              <div className="text-base text-gray-400 dark:text-gray-500 text-center">
                {title}
              </div>
            </div>
          </div>
          <div>
            <div className="flex flex-wrap max-w-[250px] justify-center">
              {getObjectKeys(data.severityBreakdown).map((severity) => {
                return (
                  <div className="flex flex-col p-4" key={severity}>
                    <div className="pr-4 flex items-center gap-x-2">
                      <div
                        className="rounded-full w-3 h-3"
                        style={{
                          backgroundColor: VULNERABILITY_SEVERITY_COLORS[severity],
                        }}
                      ></div>
                      <span className="text-[1.5rem] text-gray-900 dark:text-gray-200 font-light">
                        {data.severityBreakdown[severity]}
                      </span>
                    </div>
                    <span className="text-xs capitalize text-gray-400 dark:text-gray-500">
                      {severity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
