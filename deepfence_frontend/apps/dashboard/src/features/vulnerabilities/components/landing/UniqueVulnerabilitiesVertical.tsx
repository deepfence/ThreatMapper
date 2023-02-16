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

export const UniqueVulnerabilitiesCountVertical = () => {
  return (
    <div className="grid grid-cols-2">
      {VULNERABLE_COUNTS.map((vuln) => {
        return (
          <div className="flex flex-col p-4" key={vuln.label}>
            <div className="pr-4 flex items-center gap-x-2">
              <div
                className="rounded-full w-3 h-3"
                style={{
                  backgroundColor: vuln.color,
                }}
              ></div>
              <span className="text-[1.5rem] text-gray-900 dark:text-gray-200 font-light">
                {vuln.count}
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">{vuln.label}</span>
          </div>
        );
      })}
    </div>
  );
};
