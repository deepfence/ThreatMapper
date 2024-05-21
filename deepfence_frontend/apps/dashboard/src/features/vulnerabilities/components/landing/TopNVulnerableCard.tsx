import { useSuspenseQuery } from '@suspensive/react-query';
import { truncate } from 'lodash-es';
import { Suspense } from 'react';
import { colors, preset } from 'tailwind-preset';
import { Card, CircleSpinner } from 'ui-components';

import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { ContainerIcon } from '@/components/icons/container';
import { HostIcon } from '@/components/icons/host';
import { ImageIcon } from '@/components/icons/image';
import { ReactECharts, ReactEChartsProps } from '@/components/ReactEcharts';
import { getSeverityColorMap } from '@/constants/charts';
import { CardHeader } from '@/features/vulnerabilities/components/landing/CardHeader';
import { queries } from '@/queries';
import { Mode, useTheme } from '@/theme/ThemeContext';
import { abbreviateNumber } from '@/utils/number';
import { SeverityEnum } from '@/utils/scan';
import { usePageNavigation } from '@/utils/usePageNavigation';

export interface TopNVulnerableChartData {
  name: string;
  low: number;
  high: number;
  medium: number;
  critical: number;
  unknown: number;
}

function getChartOptions({
  data,
  theme,
}: {
  data: TopNVulnerableChartData[];
  theme: Mode;
}) {
  const color = colors[theme === 'light' ? 'variables' : 'darkVariables'].DEFAULT;

  return {
    backgroundColor: 'transparent',
    title: {
      show: false,
    },
    textStyle: {
      fontFamily: preset.theme.extend.fontFamily.body.join(','),
    },
    dataset: {
      dimensions: [
        {
          name: 'name',
          displayName: 'Container Name',
        },
        {
          name: SeverityEnum.Critical,
          displayName: 'Critical',
        },
        {
          name: SeverityEnum.High,
          displayName: 'High',
        },
        {
          name: SeverityEnum.Medium,
          displayName: 'Medium',
        },
        {
          name: SeverityEnum.Low,
          displayName: 'Low',
        },
        {
          name: SeverityEnum.Unknown,
          displayName: 'Unknown',
        },
      ],
      source: [...data].reverse(),
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      confine: true,
      borderWidth: 0,
      borderRadius: 5,
      backgroundColor: color['bg-page'],
      textStyle: {
        color: color['text-text-and-icon'],
        fontSize: '13px',
      },
    },
    legend: {
      show: false,
    },
    grid: {
      left: '2%',
      right: '5%',
      top: '10%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      splitLine: {
        lineStyle: {
          opacity: 0.6,
          color: color['chart-splitline'],
        },
      },
      axisLabel: {
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 13,
        color: color['chart-axislabel'],
        formatter: (value) => {
          return abbreviateNumber(value);
        },
      },
    },
    yAxis: {
      type: 'category',
      axisLabel: {
        formatter: (value: string) => {
          return truncate(value, { length: 20 });
        },
        fontSize: 13,
        lineHeight: 18,
        color: color['text-text-and-icon'],
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
    },
    series: [
      {
        type: 'bar',
        stack: 'total',
        color: getSeverityColorMap(theme)[SeverityEnum.Critical],
        cursor: 'pointer',
        barMaxWidth: 20,
      },
      {
        type: 'bar',
        stack: 'total',
        color: getSeverityColorMap(theme)[SeverityEnum.High],
        cursor: 'pointer',
        barMaxWidth: 20,
      },
      {
        type: 'bar',
        stack: 'total',
        color: getSeverityColorMap(theme)[SeverityEnum.Medium],
        cursor: 'pointer',
        barMaxWidth: 20,
      },
      {
        type: 'bar',
        stack: 'total',
        color: getSeverityColorMap(theme)[SeverityEnum.Low],
        cursor: 'pointer',
        barMaxWidth: 20,
      },
      {
        type: 'bar',
        stack: 'total',
        color: getSeverityColorMap(theme)[SeverityEnum.Unknown],
        cursor: 'pointer',
        barMaxWidth: 20,
      },
    ],
  } satisfies ReactEChartsProps['option'];
}

const mappings = {
  image: {
    title: 'Top vulnerable container images',
    icon: <ImageIcon />,
    path: '/vulnerability/scans?nodeType=container_image',
  },
  host: {
    title: 'Top vulnerable hosts',
    icon: <HostIcon />,
    path: '/vulnerability/scans?nodeType=host',
  },
  container: {
    title: 'Top vulnerable containers',
    icon: <ContainerIcon />,
    path: '/vulnerability/scans?nodeType=container',
  },
} as const;

export const TopNVulnerableCard = ({
  type,
}: {
  type: 'image' | 'host' | 'container';
}) => {
  const mapping = mappings[type];
  return (
    <Card className="rounded min-h-full flex flex-col">
      <CardHeader icon={mapping.icon} title={mapping.title} path={mapping.path} />
      <div className="flex-1">
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center h-[300px]">
              <CircleSpinner size="md" />
            </div>
          }
        >
          <TopNCardContent type={type} />
        </Suspense>
      </div>
    </Card>
  );
};

const TopNCardContent = ({ type }: { type: 'host' | 'container' | 'image' }) => {
  const { data } = useSuspenseQuery({
    ...queries.vulnerability.top5VulnerableAssets({ nodeType: type }),
  });
  const { mode } = useTheme();
  const chartOptions = getChartOptions({ data: data, theme: mode });
  const { navigate } = usePageNavigation();
  return (
    <div className="px-2 h-[300px] flex items-center justify-center">
      {data.length ? (
        <ReactECharts
          theme="dark"
          option={chartOptions}
          onChartClick={({ id }: { id?: string }) => {
            if (!id) {
              console.warn('Missing node id to navigate to scan page');
              return;
            }
            if (type === 'host') {
              navigate(
                `/vulnerability/scans?nodeType=host&hosts=${encodeURIComponent(id)}`,
              );
            } else if (type === 'container') {
              navigate(
                `/vulnerability/scans?nodeType=container&containers=${encodeURIComponent(
                  id,
                )}`,
              );
            } else if (type === 'image') {
              navigate(
                `/vulnerability/scans?nodeType=container_image&containerImages=${encodeURIComponent(
                  id,
                )}`,
              );
            }
          }}
        />
      ) : (
        <div className="flex items-center justify-center gap-2 text-text-text-and-icon">
          <div className="h-6 w-6 shrink-0">
            <ErrorStandardLineIcon />
          </div>
          <div>No data available</div>
        </div>
      )}
    </div>
  );
};
