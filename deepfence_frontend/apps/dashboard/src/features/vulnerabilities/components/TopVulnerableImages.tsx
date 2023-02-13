import { Bar, BarConfig, G2 } from '@ant-design/plots';
import { HiArrowSmRight } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { Card } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { Mode, useTheme } from '@/theme/ThemeContext';

export const TopContainers = ({ theme }: { theme: Mode }) => {
  const { registerTheme } = G2;
  registerTheme('dark', {
    components: {
      legend: {
        common: {
          itemName: {
            style: {
              fill: '#6B7280',
            },
          },
        },
      },
    },
  });
  registerTheme('light', {
    components: {
      legend: {
        common: {
          itemName: {
            style: {
              fill: '#9CA3AF',
            },
          },
        },
      },
    },
  });
  const data = [
    {
      node: 'wordpress:latest',
      type: 'low',
      value: 67,
    },
    {
      node: 'deepfenceio/log4j-vulnerable-app:latest',
      type: 'low',
      value: 153,
    },
    {
      node: 'mysql:latest',
      type: 'low',
      value: 22,
    },
    {
      node: 'nginx:latest',
      type: 'low',
      value: 20,
    },
    {
      node: 'wordpress:latest',
      type: 'medium',
      value: 494,
    },
    {
      node: 'deepfenceio/log4j-vulnerable-app:latest',
      type: 'medium',
      value: 124,
    },
    {
      node: 'mysql:latest',
      type: 'medium',
      value: 90,
    },
    {
      node: 'nginx:latest',
      type: 'medium',
      value: 121,
    },
    {
      node: 'deepfenceio/haproxy-log4j:latest',
      type: 'medium',
      value: 2,
    },
    {
      node: 'wordpress:latest',
      type: 'high',
      value: 348,
    },
    {
      node: 'deepfenceio/log4j-vulnerable-app:latest',
      type: 'high',
      value: 53,
    },
    {
      node: 'mysql:latest',
      type: 'high',
      value: 94,
    },
    {
      node: 'nginx:latest',
      type: 'high',
      value: 80,
    },
    {
      node: 'deepfenceio/haproxy-log4j:latest',
      type: 'high',
      value: 6,
    },
    {
      node: 'wordpress:latest',
      type: 'critical',
      value: 79,
    },
    {
      node: 'deepfenceio/log4j-vulnerable-app:latest',
      type: 'critical',
      value: 14,
    },
    {
      node: 'mysql:latest',
      type: 'critical',
      value: 25,
    },
    {
      node: 'nginx:latest',
      type: 'critical',
      value: 37,
    },
    {
      node: 'deepfenceio/haproxy-log4j:latest',
      type: 'critical',
      value: 3,
    },
  ];
  const getConfigWithTheme = (theme: Mode): BarConfig => {
    return {
      data,
      isStack: true,
      xField: 'value',
      yField: 'node',
      seriesField: 'type',
      height: 200,
      appendPadding: 10,
      maxBarWidth: 10,
      animation: false,
      barStyle: {
        // stroke: dfStyles.background,
      },
      legend: {
        layout: 'horizontal',
        position: 'bottom',
        label: {
          style: {
            fill: 'rgba(39, 190, 45, 1)',
            fontSize: 24,
          },
        },
      },
      xAxis: {
        label: {
          style: {
            fontSize: 14,
            fill: '#8f93a2',
          },
        },
        grid: {
          line: {
            style: {
              stroke: 'transparent',
            },
          },
        },
      },
      yAxis: {
        label: {
          style: {
            fontSize: 14,
            // fontFamily: dfStyles.fontFamily,
            fill: '#8f93a2',
          },
          formatter: (el) => (el.length > 14 ? `${el.substring(0, 13)}...` : `${el}`),
        },
      },
      // color: ({ type }) => getComplianceColor(type),
      interactions: [{ type: 'element-active' }],
      state: {
        active: {
          // style: ({ data }) => getActiveStyle(data),
        },
      },
      theme,
    };
  };
  return <Bar {...getConfigWithTheme(theme)} />;
};

export const TopVulnerableImages = () => {
  const { mode } = useTheme();
  return (
    <Card className="w-full p-2">
      <div className="flex">
        <h4 className="p-2 text-gray-900 text-md dark:text-white">
          Top Vulnerable Running Images
        </h4>
        <DFLink to={'/'} className="flex items-center hover:no-underline ml-auto mr-2">
          <span className="text-xs text-blue-600 dark:text-blue-500">Details</span>
          <IconContext.Provider
            value={{
              className: 'text-blue-600 dark:text-blue-500 ',
            }}
          >
            <HiArrowSmRight />
          </IconContext.Provider>
        </DFLink>
      </div>
      <TopContainers theme={mode} />
    </Card>
  );
};
