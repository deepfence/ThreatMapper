import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense } from 'react';
import { colors, preset } from 'tailwind-preset';
import { Card, CircleSpinner } from 'ui-components';

import { ECOption, ReactECharts } from '@/components/ReactEcharts';
import { SeverityLegend } from '@/components/SeverityBadge';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { getSeverityChartInnerColorMap, getSeverityColorMap } from '@/constants/charts';
import { CardHeader } from '@/features/secrets/components/landing/CardHeader';
import { queries } from '@/queries';
import { Mode, THEME_DARK, useTheme } from '@/theme/ThemeContext';
import { SecretSeverityType } from '@/types/common';
import { abbreviateNumber } from '@/utils/number';
import { usePageNavigation } from '@/utils/usePageNavigation';

function getChartOptions({
  data,
  total,
  theme,
}: {
  data: { [key: string]: number };
  total: number;
  theme: Mode;
}) {
  const isDarkTheme = theme === THEME_DARK;
  const color = colors[isDarkTheme ? 'darkVariables' : 'variables'].DEFAULT;
  const series: ECOption['series'] = [
    {
      type: 'pie',
      radius: ['63%', '68%'],
      itemStyle: {
        borderWidth: 0,
        borderColor: color['bg-card'],
      },
      label: {
        position: 'center',
        formatter: function () {
          return 'Total';
        },
        fontSize: '14px',
        offset: [0, 26],
        color: isDarkTheme ? color['text-input-value'] : color['text-icon'],
        fontWeight: 400,
        fontFamily: preset.theme.extend.fontFamily.sans.join(','),
      },
      cursor: 'none',
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
                getSeverityChartInnerColorMap(theme)[key as SecretSeverityType] ??
                getSeverityChartInnerColorMap(theme)['unknown'],
            },
          };
        }),
    },
    {
      type: 'pie',
      radius: isDarkTheme ? ['66%', '86%'] : ['67%', '86%'],
      itemStyle: {
        borderWidth: 3,
        borderColor: color['bg-card'],
      },
      label: {
        position: 'center',
        formatter: function () {
          return abbreviateNumber(total).toString();
        },
        offset: isDarkTheme ? [0, 0] : [0, -8],
        fontSize: '30px',
        color: isDarkTheme ? color['text-input-value'] : color['text-icon'],
        fontWeight: 600,
        lineHeight: 36,
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
                getSeverityColorMap(theme)[key as SecretSeverityType] ??
                getSeverityColorMap(theme)['unknown'],
            },
          };
        }),
    },
  ];
  const option: ECOption = {
    backgroundColor: 'transparent',
    tooltip: {
      show: false,
    },
    legend: {
      show: false,
    },
    series: theme === THEME_DARK ? [series[1]] : series,
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

  return <CardContent data={data} to="/secret/unique-secrets" />;
};

const MostExploitableSecretsCardContent = () => {
  const { data } = useSuspenseQuery({
    ...queries.secret.mostExploitableSecretsCount(),
  });

  return <CardContent data={data} to="/secret/most-exploitable" />;
};

const CardContent = ({ data, to }: { data: SecretsCountsCardData; to: string }) => {
  const { mode } = useTheme();
  const chartOptions = getChartOptions({
    data: data.severityBreakdown,
    total: data.total,
    theme: mode,
  });

  const { navigate } = usePageNavigation();

  return (
    <div className="flex-1 flex flex-col items-center min-h-[180px]">
      <div className="h-[180px] w-[180px]">
        <ReactECharts
          theme={mode}
          option={chartOptions}
          onChartClick={({ name }: { name: string; value: string | number | Date }) => {
            navigate(`${to}?severity=${name.toLowerCase()}`);
          }}
        />
      </div>
      <div className="mt-2 flex flex-col min-w-[160px] self-center">
        {Object.keys(data.severityBreakdown).map((severity) => {
          return (
            <div
              key={severity}
              className="flex items-center w-full justify-between py-[3px] pr-2"
            >
              <SeverityLegend severity={severity} to={`${to}?severity=${severity}`} />
              <div className="text-text-input-value text-p11">
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
