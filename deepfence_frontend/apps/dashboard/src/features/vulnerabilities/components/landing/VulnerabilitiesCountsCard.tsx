import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense } from 'react';
import { preset } from 'tailwind-preset';
import { Card, CircleSpinner } from 'ui-components';

import { ECOption, ReactECharts } from '@/components/ReactEcharts';
import { SeverityLegend } from '@/components/SeverityBadge';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { SEVERITY_COLORS } from '@/constants/charts';
import { CardHeader } from '@/features/vulnerabilities/components/landing/CardHeader';
import { queries } from '@/queries';
import { VulnerabilitySeverityType } from '@/types/common';
import { abbreviateNumber } from '@/utils/number';

function getChartOptions({
  data,
  total,
}: {
  data: { [key: string]: number };
  total: number;
}) {
  const option: ECOption = {
    backgroundColor: 'transparent',
    tooltip: {
      show: false,
    },
    legend: {
      show: false,
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
          disabled: true,
        },
        data: Object.keys(data)
          .filter((key) => data[key] > 0)
          .map((key) => {
            return {
              value: data[key],
              name: key,
              itemStyle: {
                color:
                  SEVERITY_COLORS[key as VulnerabilitySeverityType] ??
                  SEVERITY_COLORS['unknown'],
              },
            };
          }),
      },
    ],
  };
  return option;
}

export interface VulnerabilitiesCountsCardData {
  total: number;
  severityBreakdown: {
    [x in VulnerabilitySeverityType]: number;
  };
}

export const UniqueVulnerabilitiesCountsCard = () => {
  return (
    <Card className="rounded min-h-full flex flex-col">
      <CardHeader
        icon={<VulnerabilityIcon />}
        title={'Unique Vulnerabilities'}
        path={'/vulnerability/unique-vulnerabilities'}
      />
      <div className="flex-1 flex flex-col">
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <CircleSpinner size="md" />
            </div>
          }
        >
          <UniqueVulnerabilitiesCardContent />
        </Suspense>
      </div>
    </Card>
  );
};

export const MostExploitableVulnerabilitiesCountsCard = () => {
  return (
    <Card className="rounded min-h-full flex flex-col">
      <CardHeader
        icon={<VulnerabilityIcon />}
        title={'Most Exploitable Vulnerabilities'}
        path={'/vulnerability/most-exploitable'}
      />
      <div className="flex-1 flex flex-col">
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <CircleSpinner size="md" />
            </div>
          }
        >
          <MostExploitableVulnerabilitiesCardContent />
        </Suspense>
      </div>
    </Card>
  );
};

const UniqueVulnerabilitiesCardContent = () => {
  const { data } = useSuspenseQuery({
    ...queries.vulnerability.uniqueVulnerabilitiesCount(),
  });

  return <CardContent data={data} />;
};

const MostExploitableVulnerabilitiesCardContent = () => {
  const { data } = useSuspenseQuery({
    ...queries.vulnerability.mostExploitableVulnerabilitiesCount(),
  });

  return <CardContent data={data} />;
};

const CardContent = ({ data }: { data: VulnerabilitiesCountsCardData }) => {
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
