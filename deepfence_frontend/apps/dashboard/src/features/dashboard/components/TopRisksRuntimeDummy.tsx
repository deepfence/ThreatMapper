import { EChartsOption } from 'echarts';
import { preset } from 'tailwind-preset';
import { Button, Card } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { ArrowLine } from '@/components/icons/common/ArrowLine';
import { ReactECharts } from '@/components/ReactEcharts';
import { AlertIcon } from '@/components/sideNavigation/icons/Alert';
import { SEVERITY_COLORS } from '@/constants/charts';
import { CardHeader } from '@/features/dashboard/components/CardHeader';
import { RuntimeIncidentsCheckIcon } from '@/features/dashboard/components/images/RuntimeIncidentCheck';

export const TopRisksRuntimeDummy = () => {
  return (
    <Card className="rounded-[5px] flex flex-col h-full">
      <CardHeader icon={<AlertIcon />} title="Runtime incidents" />
      <div className="flex-1 flex flex-col items-center">
        <div className="relative mt-2">
          <div className="h-[152px] w-[152px] blur-[5px] opacity-[0.15]">
            <DummyDonutChart />
          </div>
          <div className="absolute h-[150px] w-[150px] inset-0">
            <RuntimeIncidentsCheckIcon />
          </div>
        </div>
        <div className="text-h3 dark:text-text-input-value">Runtime Protection</div>
        <div className="px-6 pt-1 text-center text-p1 dark:text-text-text-and-icon">
          Extend ThreatMapper with runtime attack analysis, threat assessment, and
          targeted protection for your applications. Scalable, supported, and ready for
          action!
        </div>
        <DFLink
          unstyled
          className="my-2"
          href="https://deepfence.io/threatstryker/"
          target="_blank"
        >
          <Button color="success" endIcon={<ArrowLine className="rotate-90" />}>
            Get ThreatStryker
          </Button>
        </DFLink>
      </div>
    </Card>
  );
};

const DummyDonutChart = () => {
  const data: { [x: string]: number } = {
    critical: 100,
    high: 50,
    medium: 25,
    low: 12,
    unknown: 0,
  };
  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      show: false,
    },
    legend: {
      show: false,
    },
    dataset: {
      source: Object.keys(data).map((key) => ({
        Secrets: key,
        value: data[key],
      })),
    },
    series: [
      {
        type: 'pie',
        radius: ['72%', '100%'],
        itemStyle: {
          borderWidth: 2,
          borderColor: preset.theme.extend.colors.bg.card,
        },
        label: {
          show: false,
        },
        cursor: 'default',
        emphasis: {
          disabled: true,
        },
        silent: true,
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
  return <ReactECharts theme="dark" option={option} />;
};
