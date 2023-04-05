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
        <div className="flex justify-center my-4 divide-x dark:divide-gray-700">
          {[1, 2, 3, 4, 5].map((idx) => {
            return (
              <div key={idx} className="flex flex-col font-light px-4">
                <div className={`h-6 my-1 w-6 ${skeletonBg}`}></div>
                <div className={`h-3 mt-1 w-12 ${skeletonBg}`}></div>
              </div>
            );
          })}
        </div>
        <h6 className={`ml-2 mt-8 mb-6 text-sm font-normal`}>
          Most Vulnerable Running Assets
        </h6>
        <div className="flex mt-2 items-center gap-4">
          <div className={`h-[140px] basis-[140px] rounded-full ${skeletonBg}`}></div>
          <div className="flex flex-col gap-y-2 flex-1 truncate">
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
        <div className={`flex justify-center gap-4 mt-4 mb-4 text-xs`}>
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <div
              className="h-3 w-4 rounded-sm"
              style={{
                backgroundColor: SEVERITY_COLORS['critical'],
              }}
            ></div>
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <div
              className="h-3 w-4 rounded-sm"
              style={{
                backgroundColor: SEVERITY_COLORS['high'],
              }}
            ></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <div
              className="h-3 w-4 rounded-sm"
              style={{
                backgroundColor: SEVERITY_COLORS['medium'],
              }}
            ></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <div
              className="h-3 w-4 rounded-sm"
              style={{
                backgroundColor: SEVERITY_COLORS['low'],
              }}
            ></div>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <div
              className="h-3 w-4 rounded-sm"
              style={{
                backgroundColor: SEVERITY_COLORS['unknown'],
              }}
            ></div>
            <span>Unknown</span>
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
        <div className="flex justify-center my-4 divide-x dark:divide-gray-700">
          {[
            {
              label: 'Total',
              count: data.total,
            },
            {
              label: 'Critical',
              count: data.severityBreakdown.critical,
            },
            {
              label: 'High',
              count: data.severityBreakdown.high,
            },
            {
              label: 'Medium',
              count: data.severityBreakdown.medium,
            },
            {
              label: 'Low',
              count: data.severityBreakdown.low,
            },
            {
              label: 'Unknown',
              count: data.severityBreakdown.unknown,
            },
          ].map(({ count, label }) => {
            return (
              <div key={label} className="flex flex-col font-light px-4">
                <span className="text-2xl">{abbreviateNumber(count)}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
              </div>
            );
          })}
        </div>
        {/* <Separator /> */}
        <h6 className={`ml-2 mt-8 mb-6 text-sm font-normal`}>
          Most Vulnerable Running Assets
        </h6>
        <div className="flex mt-2 items-center gap-4">
          <div className="h-[140px] basis-[140px]">
            <TopRisksDonutChart theme={mode} severityBreakdown={data.severityBreakdown} />
          </div>
          <div className="flex flex-col gap-y-2 flex-1 truncate">
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
                    {node.critical}
                  </div>
                  <div className={`flex items-center gap-1 font-semibold text-xs`}>
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: SEVERITY_COLORS['high'],
                      }}
                    ></div>
                    {node.high}
                  </div>
                  <div className={`flex items-center gap-1 font-semibold text-xs`}>
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: SEVERITY_COLORS['medium'],
                      }}
                    ></div>
                    <span>{node.medium}</span>
                  </div>
                  <div className={`flex items-center gap-1 font-semibold text-xs`}>
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: SEVERITY_COLORS['low'],
                      }}
                    ></div>
                    <span>{node.low}</span>
                  </div>
                  <div className={`flex items-center gap-1 font-semibold text-xs`}>
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: SEVERITY_COLORS['unknown'],
                      }}
                    ></div>
                    <span>{node.unknown}</span>
                  </div>
                  <span className={`text-xs flex-grow flex-shrink-0 basis-0 truncate`}>
                    {node.nodeName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className={`flex justify-center gap-4 mt-4 mb-4 text-xs`}>
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <div
              className="h-3 w-4 rounded-sm"
              style={{
                backgroundColor: SEVERITY_COLORS['critical'],
              }}
            ></div>
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <div
              className="h-3 w-4 rounded-sm"
              style={{
                backgroundColor: SEVERITY_COLORS['high'],
              }}
            ></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <div
              className="h-3 w-4 rounded-sm"
              style={{
                backgroundColor: SEVERITY_COLORS['medium'],
              }}
            ></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <div
              className="h-3 w-4 rounded-sm"
              style={{
                backgroundColor: SEVERITY_COLORS['low'],
              }}
            ></div>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <div
              className="h-3 w-4 rounded-sm"
              style={{
                backgroundColor: SEVERITY_COLORS['unknown'],
              }}
            ></div>
            <span>Unknown</span>
          </div>
        </div>
      </div>
    </div>
  );
};
