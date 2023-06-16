import { cn } from 'tailwind-preset';

import { SeverityScoreIcon } from '@/components/icons/common/SeverityScore';
import { getColorForCVSSScore } from '@/constants/charts';

export const SeverityBadge = ({
  severity,
  className,
}: {
  severity: string;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'flex items-center capitalize justify-center font-semibold leading-4 text-[11px] dark:text-text-text-inverse py-0.5 max-w-[62px] min-w-[62px]',
        'dark:bg-df-gray-500 rounded-[5px]',
        {
          'dark:bg-status-error': severity === 'critical',
          'dark:bg-chart-orange': severity === 'high',
          'dark:bg-status-warning': severity === 'medium',
          'dark:bg-chart-yellow1': severity === 'low',
        },
        className,
      )}
    >
      {severity}
    </div>
  );
};

export const CveCVSSScore = ({
  score,
  className,
  iconClassName,
}: {
  score?: number;
  className?: string;
  iconClassName?: string;
}) => {
  return (
    <div
      className={cn('flex gap-1 items-center text-p3', className)}
      style={{
        color: getColorForCVSSScore(score),
      }}
    >
      <div className={cn('h-[16px] w-[16px] shrink-0', iconClassName)}>
        <SeverityScoreIcon />
      </div>
      <div>{score?.toFixed(1) ?? '—'}</div>
    </div>
  );
};
