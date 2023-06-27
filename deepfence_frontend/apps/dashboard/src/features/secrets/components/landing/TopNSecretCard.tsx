import { useSuspenseQuery } from '@suspensive/react-query';
import { truncate } from 'lodash-es';
import { Suspense } from 'react';
import { preset } from 'tailwind-preset';
import { Card, CircleSpinner } from 'ui-components';

import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { ContainerIcon } from '@/components/icons/container';
import { HostIcon } from '@/components/icons/host';
import { ImageIcon } from '@/components/icons/image';
import { ReactECharts, ReactEChartsProps } from '@/components/ReactEcharts';
import { SEVERITY_COLORS } from '@/constants/charts';
import { CardHeader } from '@/features/secrets/components/landing/CardHeader';
import { queries } from '@/queries';

export interface TopNSecretChartData {
  name: string;
  low: number;
  high: number;
  medium: number;
  critical: number;
  unknown: number;
}

function getChartOptions({ data }: { data: TopNSecretChartData[] }) {
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
      backgroundColor: '#000',
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
          color: preset.theme.extend.colors['df-gray'][900],
        },
      },
      axisLabel: {
        fontWeight: 600,
        color: preset.theme.extend.colors['df-gray']['600'],
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
        color: SEVERITY_COLORS['critical'],
        cursor: 'default',
        barMaxWidth: 20,
      },
      {
        type: 'bar',
        stack: 'total',
        color: SEVERITY_COLORS['high'],
        cursor: 'default',
        barMaxWidth: 20,
      },
      {
        type: 'bar',
        stack: 'total',
        color: SEVERITY_COLORS['medium'],
        cursor: 'default',
        barMaxWidth: 20,
      },
      {
        type: 'bar',
        stack: 'total',
        color: SEVERITY_COLORS['low'],
        cursor: 'default',
        barMaxWidth: 20,
      },
      {
        type: 'bar',
        stack: 'total',
        color: SEVERITY_COLORS['unknown'],
        cursor: 'default',
        barMaxWidth: 20,
      },
    ],
  } satisfies ReactEChartsProps['option'];
}

const mappings = {
  image: {
    title: 'Top secret container images',
    icon: <ImageIcon />,
    path: '/secret/scans?nodeType=container_image',
  },
  host: {
    title: 'Top secret hosts',
    icon: <HostIcon />,
    path: '/secret/scans?nodeType=host',
  },
  container: {
    title: 'Top secret containers',
    icon: <ContainerIcon />,
    path: '/secret/scans?nodeType=container',
  },
} as const;

export const TopNSecretCard = ({ type }: { type: 'image' | 'host' | 'container' }) => {
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
    ...queries.secret.top5SecretAssets({ nodeType: type }),
  });
  const chartOptions = getChartOptions({ data: data });

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
