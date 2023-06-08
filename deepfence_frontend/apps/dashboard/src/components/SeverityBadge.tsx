export const SeverityBadge = ({ severity }: { severity: string }) => {
  return (
    <div className="flex items-center capitalize text-p4 dark:text-text-text-and-icon gap-[6px]">
      <div className="h-[18px] w-[18px]">
        <SeverityIcon severity={severity} />
      </div>{' '}
      {severity}
    </div>
  );
};

const SeverityIcon = ({ severity }: { severity: string }) => {
  const severities = ['unknown', 'low', 'medium', 'high', 'critical'];
  const activeFillClassName =
    {
      critical: 'dark:fill-status-error',
      high: 'dark:fill-chart-orange',
      medium: 'dark:fill-status-warning',
      low: 'dark:fill-chart-yellow1',
    }[severity] ?? '';
  const defaultFillClassName = 'dark:fill-df-gray-700';
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="1.23389"
        y="12"
        width="2"
        height="3"
        rx="1"
        className={
          severities.indexOf(severity) > 0 ? activeFillClassName : defaultFillClassName
        }
      />
      <rect
        x="5.23389"
        y="9"
        width="2"
        height="6"
        rx="1"
        className={
          severities.indexOf(severity) > 1 ? activeFillClassName : defaultFillClassName
        }
      />
      <rect
        x="9.23389"
        y="6"
        width="2"
        height="9"
        rx="1"
        className={
          severities.indexOf(severity) > 2 ? activeFillClassName : defaultFillClassName
        }
      />
      <rect
        x="13.2339"
        y="3"
        width="2"
        height="12"
        rx="1"
        className={
          severities.indexOf(severity) > 3 ? activeFillClassName : defaultFillClassName
        }
      />
    </svg>
  );
};
