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
          name: 'critical',
          displayName: 'Critical',
        },
        {
          name: 'high',
          displayName: 'High',
        },
        {
          name: 'medium',
          displayName: 'Medium',
        },
        {
          name: 'low',
          displayName: 'Low',
        },
        {
          name: 'unknown',
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
      backgroundColor: preset.theme.extend.colors.bg.page,
      textStyle: {
        color: preset.theme.extend.colors.text['input-value'],
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
          color: colors[theme].chart.splitLine,
        },
      },
      axisLabel: {
        fontWeight: 600,
        color: colors[theme].chart.axisLabel,
      },
    },
    yAxis: {
      type: 'category',
      axisLabel: {
        formatter: (value: string) => {
          return truncate(value, { length: 20 });
        },
        fontSize: '12px',
        color: preset.theme.extend.colors.text['text-and-icon'],
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
        color: getSeverityColorMap(theme)['critical'],
        cursor: 'default',
        barMaxWidth: 20,
      },
      {
        type: 'bar',
        stack: 'total',
        color: getSeverityColorMap(theme)['high'],
        cursor: 'default',
        barMaxWidth: 20,
      },
      {
        type: 'bar',
        stack: 'total',
        color: getSeverityColorMap(theme)['medium'],
        cursor: 'default',
        barMaxWidth: 20,
      },
      {
        type: 'bar',
        stack: 'total',
        color: getSeverityColorMap(theme)['low'],
        cursor: 'default',
        barMaxWidth: 20,
      },
      {
        type: 'bar',
        stack: 'total',
        color: getSeverityColorMap(theme)['unknown'],
        cursor: 'default',
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

  return (
    <div className="pb-3 pt-5 px-5 h-[300px] flex items-center justify-center">
      {data.length ? (
        <ReactECharts theme="dark" option={chartOptions} />
      ) : (
        <div className="flex items-center justify-center gap-2 dark:text-text-text-and-icon">
          <div className="h-6 w-6 shrink-0">
            <ErrorStandardLineIcon />
          </div>
          <div>No data available</div>
        </div>
      )}
    </div>
  );
};
