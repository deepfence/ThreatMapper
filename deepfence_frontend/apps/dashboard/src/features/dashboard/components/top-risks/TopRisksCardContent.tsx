import classNames from 'classnames';

import { SEVERITY_COLORS } from '@/constants/charts';
import { TopRisksDonutChart } from '@/features/dashboard/components/top-risks/TopRisksDonutChart';
import { DashboardLoaderData } from '@/features/dashboard/pages/Dashboard';
import { useTheme } from '@/theme/ThemeContext';
import { abbreviateNumber } from '@/utils/number';

const skeletonBg = 'bg-gray-200 dark:bg-gray-600 animate-pulse';

export const TopRisksCardContentsSkeleton = () => {
  return (
    <div className="mt-4">
      <div className="h-full dark:text-white">
        <div className="flex justify-center my-8 divide-x dark:divide-gray-700">
          {[1, 2, 3, 4, 5].map((idx) => {
            return (
              <div key={idx} className="flex flex-col font-light px-4">
                <div className={`h-6 my-1 w-6 ${skeletonBg}`}></div>
                <div className={`h-3 mt-1 w-12 ${skeletonBg}`}></div>
              </div>
            );
          })}
        </div>

        <div className="flex mt-2 items-center gap-4">
          <div className={`h-[140px] basis-[140px] rounded-full ${skeletonBg}`}></div>
          <div className="flex flex-col gap-y-2 flex-1 truncate">
            <h6 className={`mt-8 mb-4 text-sm font-normal`}>Most Affected Resources</h6>
            {[1, 2, 3, 4, 5].map((idx) => {
              return (
                <div key={idx} className="flex gap-x-2">
                  <div className={`flex items-center gap-1 font-semibold text-xs flex-1`}>
                    <div className={`h-6 w-2 ${skeletonBg} flex-1`}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const TopRisksCardContent = ({
  data,
}: {
  data: DashboardLoaderData['vulnerabilitiesData'];
}) => {
  const { mode } = useTheme();
  return (
    <div className="mt-4">
      <div className="h-full dark:text-white">
        <div className="flex justify-center items-center flex-wrap gap-y-2 my-8 ">
          {[
            {
              label: 'Total',
              count: data.total,
              color: null,
            },
            {
              label: 'Critical',
              count: data.severityBreakdown.critical,
              color: SEVERITY_COLORS['critical'],
            },
            {
              label: 'High',
              count: data.severityBreakdown.high,
              color: SEVERITY_COLORS['high'],
            },
            {
              label: 'Medium',
              count: data.severityBreakdown.medium,
              color: SEVERITY_COLORS['medium'],
            },
            {
              label: 'Low',
              count: data.severityBreakdown.low,
              color: SEVERITY_COLORS['low'],
            },
            {
              label: 'Unknown',
              count: data.severityBreakdown.unknown,
              color: SEVERITY_COLORS['unknown'],
            },
          ].map(({ count, label, color }) => {
            return (
              <div key={label} className="flex flex-col font-light px-4">
                <span
                  className={classNames('flex items-center gap-2 text-2xl', {
                    ['text-4xl']: label === 'Total',
                  })}
                >
                  {abbreviateNumber(count)}
                </span>
                {label !== 'Total' && (
                  <div className="flex items-center gap-1">
                    {color && (
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: color,
                        }}
                      ></div>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      {label}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex mt-2 gap-4">
          <div className="h-[140px] basis-[140px]">
            <TopRisksDonutChart theme={mode} severityBreakdown={data.severityBreakdown} />
          </div>
          <div className="flex flex-col gap-y-2 flex-1 truncate">
            <h6 className={`mt-2 mb-1 text-sm font-normal`}>Most Affected Resources</h6>
            {data.top5Assets.length === 0 && (
              <span className="text-xs">No data Available</span>
            )}
            {data.top5Assets.map((node) => {
              return (
                <div key={node.nodeName} className="flex gap-x-2">
                  <div className={`flex items-center gap-1 font-semibold text-xs`}>
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: SEVERITY_COLORS['critical'],
                      }}
                    ></div>
                    <span>{abbreviateNumber(node.critical)}</span>
                  </div>
                  <div className={`flex items-center gap-1 font-semibold text-xs`}>
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: SEVERITY_COLORS['high'],
                      }}
                    ></div>
                    <span>{abbreviateNumber(node.high)}</span>
                  </div>
                  <div className={`flex items-center gap-1 font-semibold text-xs`}>
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: SEVERITY_COLORS['medium'],
                      }}
                    ></div>
                    <span>{abbreviateNumber(node.medium)}</span>
                  </div>
                  <div className={`flex items-center gap-1 font-semibold text-xs`}>
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: SEVERITY_COLORS['low'],
                      }}
                    ></div>
                    <span>{abbreviateNumber(node.low)}</span>
                  </div>
                  <div className={`flex items-center gap-1 font-semibold text-xs`}>
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: SEVERITY_COLORS['unknown'],
                      }}
                    ></div>
                    <span>{abbreviateNumber(node.unknown)}</span>
                  </div>
                  <span className={`text-xs flex-grow flex-shrink-0 basis-0 truncate`}>
                    {node.nodeName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
