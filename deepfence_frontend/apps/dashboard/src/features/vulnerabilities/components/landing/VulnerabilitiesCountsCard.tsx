import { EChartsOption } from 'echarts';
import { capitalize } from 'lodash-es';
import { HiOutlineChevronRight } from 'react-icons/hi';
import { Button, Card, CircleSpinner, Separator } from 'ui-components';

import { ReactECharts } from '@/components/ReactEcharts';
import { SEVERITY_COLORS } from '@/constants/charts';
import { Mode, useTheme } from '@/theme/ThemeContext';
import { VulnerabilitySeverityType } from '@/types/common';
import { getObjectKeys } from '@/utils/array';
import { abbreviateNumber } from '@/utils/number';
import { usePageNavigation } from '@/utils/usePageNavigation';

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
        radius: ['80%', '100%'],
        top: '10%',
        avoidLabelOverlap: true,
        label: {
          show: false,
          position: 'center',
        },
        color: [
          SEVERITY_COLORS['critical'],
          SEVERITY_COLORS['high'],
          SEVERITY_COLORS['medium'],
          SEVERITY_COLORS['low'],
          SEVERITY_COLORS['unknown'],
        ],
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
  detailsLink,
}: {
  title: string;
  data?: VulnerabilitiesCountsCardData;
  loading: boolean;
  detailsLink: string;
}) => {
  const { mode } = useTheme();
  const { navigate } = usePageNavigation();
  return (
    <Card className="flex h-full p-2 flex-col">
      <div className="flex items-center pb-2">
        <h4 className="text-gray-900 font-medium text-base dark:text-white truncate">
          {title}
        </h4>
        <div className="flex ml-auto">
          <Button
            color="normal"
            size="xs"
            onClick={(e) => {
              e.preventDefault();
              navigate(detailsLink);
            }}
          >
            Details&nbsp;
            <HiOutlineChevronRight />
          </Button>
        </div>
      </div>
      <Separator />
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
                {abbreviateNumber(data.total)}
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
                          backgroundColor: SEVERITY_COLORS[severity],
                        }}
                      ></div>
                      <span className="text-[1.5rem] text-gray-900 dark:text-gray-200 font-light">
                        {abbreviateNumber(data.severityBreakdown[severity])}
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
