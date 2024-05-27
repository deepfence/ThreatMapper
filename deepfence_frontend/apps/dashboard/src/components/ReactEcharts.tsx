import type {
  BarSeriesOption,
  GaugeSeriesOption,
  LineSeriesOption,
  PieSeriesOption,
} from 'echarts/charts';
import { BarChart, GaugeChart, LineChart, PieChart } from 'echarts/charts';
import type {
  DatasetComponentOption,
  GridComponentOption,
  LegendComponentOption,
  TitleComponentOption,
  TooltipComponentOption,
} from 'echarts/components';
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  TransformComponent,
} from 'echarts/components';
import type { ECharts, SetOptionOpts } from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import { getInstanceByDom, init, use } from 'echarts/core';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { SVGRenderer } from 'echarts/renderers';
import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import { useMeasure } from 'react-use';

import { Mode, useTheme } from '@/theme/ThemeContext';

export type ECOption = ComposeOption<
  | BarSeriesOption
  | GaugeSeriesOption
  | PieSeriesOption
  | LineSeriesOption
  | GridComponentOption
  | TitleComponentOption
  | LegendComponentOption
  | TooltipComponentOption
  | DatasetComponentOption
>;

export interface ReactEChartsProps {
  option: ECOption;
  style?: CSSProperties;
  settings?: SetOptionOpts;
  loading?: boolean;
  onChartClick?: (data: {
    name: string;
    value: string | number | Date;
    id?: string;
  }) => void;
}

use([
  TitleComponent,
  LegendComponent,
  TooltipComponent,
  DatasetComponent,
  GridComponent,
  TransformComponent,
  BarChart,
  LineChart,
  PieChart,
  GaugeChart,
  LabelLayout,
  UniversalTransition,
  SVGRenderer,
]);
export function ReactECharts({
  option,
  style,
  settings,
  loading,
  onChartClick,
}: ReactEChartsProps): JSX.Element {
  const { mode: theme } = useTheme();
  const chartRef = useRef<HTMLDivElement>(null);
  const [measurerRef, { width, height }] = useMeasure<HTMLDivElement>();

  useEffect(() => {
    // Initialize chart
    let chart: ECharts | undefined;
    if (chartRef.current !== null) {
      chart = init(chartRef.current, theme, {
        renderer: 'svg',
      });
    }

    // Return cleanup function
    return () => {
      chart?.dispose();
    };
  }, [theme]);

  useEffect(() => {
    // Update chart
    if (chartRef.current !== null) {
      const chart = getInstanceByDom(chartRef.current);
      chart?.setOption(option, settings);
      chart?.on('click', (params) => {
        onChartClick?.({
          name: params.name,
          id: (
            params.data as {
              id: string;
            }
          ).id,
          value: params.value as string | number | Date,
        });
      });
    }
    return () => {
      if (chartRef.current !== null) {
        const chart = getInstanceByDom(chartRef.current);
        chart?.off('click');
      }
    };
  }, [option, settings, theme]); // Whenever theme changes we need to add option and setting due to it being deleted in cleanup function

  useEffect(() => {
    if (chartRef.current !== null) {
      const chart = getInstanceByDom(chartRef.current);
      chart?.resize();
    }
  }, [width, height]);

  useEffect(() => {
    // Update chart
    if (chartRef.current !== null) {
      const chart = getInstanceByDom(chartRef.current);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      loading === true
        ? chart?.showLoading({
            lineWidth: 2,
            text: 'Loading',
          })
        : chart?.hideLoading();
    }
  }, [loading, theme]);

  return (
    <div className="w-full h-full" ref={measurerRef}>
      <div ref={chartRef} style={{ width, height, ...style }} />
    </div>
  );
}
