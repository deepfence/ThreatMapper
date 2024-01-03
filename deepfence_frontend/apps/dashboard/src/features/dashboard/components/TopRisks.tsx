import { useSuspenseQuery } from '@suspensive/react-query';
import { ReactNode, Suspense } from 'react';
import { colors, preset } from 'tailwind-preset';
import { Card, CircleSpinner } from 'ui-components';

import { ECOption, ReactECharts } from '@/components/ReactEcharts';
import { SeverityLegend } from '@/components/SeverityBadge';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { getSeverityColorMap } from '@/constants/charts';
import { CardHeader } from '@/features/dashboard/components/CardHeader';
import { queries } from '@/queries';
import { Mode, useTheme } from '@/theme/ThemeContext';
import { VulnerabilitySeverityType } from '@/types/common';
import { abbreviateNumber } from '@/utils/number';
import { usePageNavigation } from '@/utils/usePageNavigation';

function useSummary(type: 'vulnerability' | 'secret' | 'malware') {
  if (type === 'vulnerability') {
    return useSuspenseQuery({
      ...queries.vulnerability.uniqueVulnerabilitiesCount(),
      enabled: type === 'vulnerability',
    });
  } else if (type === 'secret') {
    return useSuspenseQuery({
      ...queries.secret.uniqueSecretsCount(),
    });
  }
  return useSuspenseQuery({
    ...queries.malware.uniqueMalwaresCount(),
  });
}

const RISK_TYPES: {
  [x in 'vulnerability' | 'secret' | 'malware']: {
    title: string;
    icon: ReactNode;
    link: string;
  };
} = {
  vulnerability: {
    title: 'Vulnerabilities',
    icon: <VulnerabilityIcon />,
    link: '/vulnerability',
  },
  secret: {
    title: 'Secrets',
    icon: <SecretsIcon />,
    link: '/secret',
  },
  malware: {
    title: 'Malwares',
    icon: <MalwareIcon />,
    link: '/malware',
  },
};

export const TopRisks = ({
  type,
  to,
}: {
  type: 'vulnerability' | 'secret' | 'malware';
  to: string;
}) => {
  return (
    <Card className="rounded-[5px] flex flex-col h-full">
      <CardHeader
        icon={RISK_TYPES[type].icon}
        title={RISK_TYPES[type].title}
        link={RISK_TYPES[type].link}
      />
      <div className="flex-1 flex items-center justify-center">
        <Suspense fallback={<CircleSpinner size="md" />}>
          <TopRisksContent type={type} to={to} />
        </Suspense>
      </div>
    </Card>
  );
};

const TopRisksContent = ({
  type,
  to,
}: {
  type: 'vulnerability' | 'secret' | 'malware';
  to: string;
}) => {
  const { mode } = useTheme();
  const { data } = useSummary(type);
  if (!data) throw new Error('data is empty');
  const chartOptions = getChartOptions({
    data: data.severityBreakdown,
    total: data.total,
    theme: mode,
  });

  const { navigate } = usePageNavigation();
  return (
    <div className="flex-1 flex flex-col items-center py-1.5">
      <div className="max-w-[162px] max-h-[162px] h-[162px] w-[162px]">
        <ReactECharts
          theme="dark"
          option={chartOptions}
          onChartClick={({ name }: { name: string; value: string | number | Date }) => {
            navigate(`${to}?severity=${name.toLowerCase()}`);
          }}
        />
      </div>
      <div className="mt-4 flex flex-col min-w-[184px] self-center">
        {Object.keys(data.severityBreakdown).map((severity) => {
          return (
            <div
              key={severity}
              className="flex items-center w-full justify-between py-[3px] pr-2"
            >
              <SeverityLegend
                severity={severity}
                className="text-p4"
                to={`${to}?severity=${severity}`}
              />
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

function getChartOptions({
  data,
  total,
  theme,
}: {
  data: { [key: string]: number };
  total: number;
  theme: Mode;
}) {
  const color = colors[theme === 'dark' ? 'darkVariables' : 'variables'].DEFAULT;
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
          borderColor: color['bg-card'],
        },
        label: {
          position: 'center',
          formatter: function () {
            return abbreviateNumber(total).toString();
          },
          fontSize: '30px',
          color: color['text-input-value'],
          fontWeight: 600,
          fontFamily: preset.theme.extend.fontFamily.sans.join(','),
        },
        cursor: 'pointer',
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
                  getSeverityColorMap(theme)[key as VulnerabilitySeverityType] ??
                  getSeverityColorMap(theme)['unknown'],
              },
            };
          }),
      },
    ],
  };
  return option;
}
