import { UniqueVulnerabilityChart } from '@/features/vulnerabilities/components/landing/UniqueVulnerabilityChart';
import { Mode } from '@/theme/ThemeContext';

const color_critical = '#ff4570';
const color_high = '#f90';
const color_medium = '#F8CD39';
const color_low = '#9CA3AF';

const VULNERABLE_COUNTS = [
  {
    label: 'Critical',
    count: 65,
    color: color_critical,
  },
  {
    label: 'High',
    count: 169,
    color: color_high,
  },
  {
    label: 'Medium',
    count: 176,
    color: color_medium,
  },
  {
    label: 'Low',
    count: 44,
    color: color_low,
  },
];

export const UniqueVulnerabilitiesCount = ({ theme }: { theme: Mode }) => {
  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      <div className="flex h-full p-2 items-center justify-center">
        <UniqueVulnerabilityChart theme={theme} />
      </div>
      <div className="flex items-center justify-start">
        <div className="px-4 flex flex-col place-content-center gap-x-4 border-r border-gray-200 dark:border-gray-700">
          <span className="text-[2.5rem] text-gray-900 dark:text-gray-200 font-light">
            454
          </span>
          <span className="text-sm text-gray-400 dark:text-gray-500">Total</span>
        </div>

        <div className="ml-4 grid grid-cols-2">
          {VULNERABLE_COUNTS.map((vuln) => {
            return (
              <div className="flex flex-col p-4" key={vuln.label}>
                <div className="pr-4 flex items-center gap-x-2">
                  <div
                    className="rounded-full w-2 h-2"
                    style={{
                      backgroundColor: vuln.color,
                    }}
                  ></div>
                  <span className="text-[1.5rem] text-gray-900 dark:text-gray-200 font-light">
                    {vuln.count}
                  </span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {vuln.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
