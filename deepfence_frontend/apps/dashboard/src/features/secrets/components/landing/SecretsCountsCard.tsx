import { useSuspenseQuery } from '@suspensive/react-query';
import { EChartsOption } from 'echarts';
import { Suspense } from 'react';
import { preset } from 'tailwind-preset';
import { Card, CircleSpinner } from 'ui-components';

import { ReactECharts } from '@/components/ReactEcharts';
import { SeverityLegend } from '@/components/SeverityBadge';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { SEVERITY_COLORS } from '@/constants/charts';
import { CardHeader } from '@/features/secrets/components/landing/CardHeader';
import { queries } from '@/queries';
import { SecretSeverityType } from '@/types/common';
import { abbreviateNumber } from '@/utils/number';

function getChartOptions({
  data,
  total,
}: {
  data: { [key: string]: number };
  total: number;
}) {
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
        radius: ['70%', '100%'],
        itemStyle: {
          borderWidth: 2,
          borderColor: preset.theme.extend.colors.bg.card,
        },
        label: {
          position: 'center',
          formatter: function () {
            return abbreviateNumber(total).toString();
          },
          fontSize: '30px',
          color: preset.theme.extend.colors.text['input-value'],
          fontWeight: 600,
          fontFamily: preset.theme.extend.fontFamily.sans.join(','),
        },
        cursor: 'default',
        emphasis: {
          scale: false,
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
  return option;
}

export interface SecretsCountsCardData {
  total: number;
  severityBreakdown: {
    [x in SecretSeverityType]: number;
  };
}

export const UniqueSecretsCountsCard = () => {
  return (
    <Card className="rounded min-h-full flex flex-col">
      <CardHeader
        icon={<SecretsIcon />}
        title={'Unique Secrets'}
        path={'/secret/unique-secrets'}
      />
      <div className="flex-1 flex flex-col">
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <CircleSpinner size="md" />
            </div>
          }
        >
          <UniqueSecretsCardContent />
        </Suspense>
      </div>
    </Card>
  );
};

export const MostExploitableSecretsCountsCard = () => {
  return (
    <Card className="rounded min-h-full flex flex-col">
      <CardHeader
        icon={<SecretsIcon />}
        title={'Most Exploitable Secrets'}
        path={'/secret/most-exploitable'}
      />
      <div className="flex-1 flex flex-col">
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <CircleSpinner size="md" />
            </div>
          }
        >
          <MostExploitableSecretsCardContent />
        </Suspense>
      </div>
    </Card>
  );
};

const UniqueSecretsCardContent = () => {
  const { data } = useSuspenseQuery({
    ...queries.secret.uniqueSecretsCount(),
  });

  return <CardContent data={data} />;
};

const MostExploitableSecretsCardContent = () => {
  const { data } = useSuspenseQuery({
    ...queries.secret.mostExploitableSecretsCount(),
  });

  return <CardContent data={data} />;
};

const CardContent = ({ data }: { data: SecretsCountsCardData }) => {
  const chartOptions = getChartOptions({
    data: data.severityBreakdown,
    total: data.total,
  });

  return (
    <div className="flex-1 flex flex-col items-center">
      <div className="max-w-[200px] max-h-[200px] h-[200px] w-[200px] mt-6">
        <ReactECharts theme="dark" option={chartOptions} />
      </div>
      <div className="mt-8 flex flex-col min-w-[160px] self-center">
        {Object.keys(data.severityBreakdown).map((severity) => {
          return (
            <div
              key={severity}
              className="flex items-center w-full justify-between py-[3px] pr-2"
            >
              <SeverityLegend severity={severity} />
              <div className="dark:text-text-input-value text-p7">
                {abbreviateNumber(
                  data.severityBreakdown[severity as keyof typeof data.severityBreakdown],
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
