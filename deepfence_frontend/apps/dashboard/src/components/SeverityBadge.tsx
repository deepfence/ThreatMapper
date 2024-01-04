import { upperFirst } from 'lodash-es';
import { cn } from 'tailwind-preset';

import { DFLink } from '@/components/DFLink';
import { SeverityScoreIcon } from '@/components/icons/common/SeverityScore';
import { getColorForCVSSScore, getPostureColor } from '@/constants/charts';
import { useTheme } from '@/theme/ThemeContext';
import { PostureSeverityType } from '@/types/common';

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
        'flex items-center capitalize justify-center font-semibold leading-4 text-[11px] dark:text-text-text-inverse text-text-text-inverse py-0.5 max-w-[62px] min-w-[62px]',
        ' rounded-[5px]',
        {
          'bg-status-error': severity === 'critical',
          'bg-chart-orange text-text-input-value': severity === 'high',
          'bg-status-warning text-text-input-value': severity === 'medium',
          'bg-chart-yellow1 text-text-input-value': severity === 'low',
          'dark:bg-df-gray-500 bg-df-gray-600': !severity || severity === 'unknown',
        },
        className,
      )}
    >
      {severity}
    </div>
  );
};

export const PostureStatusBadge = ({
  status,
  className,
}: {
  status: PostureSeverityType;
  className?: string;
}) => {
  const { mode } = useTheme();
  return (
    <div
      className={cn(
        'flex items-center capitalize justify-center font-semibold leading-4 text-[11px] dark:text-text-text-inverse text-text-input-value py-0.5 max-w-[62px] min-w-[62px]',
        'bg-df-gray-500 rounded-[5px]',
        {
          'text-text-text-inverse': status === 'alarm' || status === 'delete',
        },
        className,
      )}
      style={{
        backgroundColor: getPostureColor(mode)[status],
      }}
    >
      {status}
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
  const { mode } = useTheme();
  return (
    <div
      className={cn('flex gap-1 items-center text-p3', className)}
      style={{
        color: getColorForCVSSScore(mode, score),
      }}
    >
      <div className={cn('h-[16px] w-[16px] shrink-0', iconClassName)}>
        <SeverityScoreIcon />
      </div>
      <div>{score?.toFixed(1) ?? '—'}</div>
    </div>
  );
};

export const SeverityLegend = ({
  severity,
  className,
  iconClassName,
  to,
}: {
  severity: string;
  className?: string;
  iconClassName?: string;
  to?: string;
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-2 flex-nowrap text-p7 text-text-text-and-icon capitalize',
        className,
      )}
    >
      <div
        className={cn(
          'rounded-full h-3 w-3 shrink-0',
          {
            'bg-status-error': severity === 'critical',
            'bg-chart-orange text-text-input-value': severity === 'high',
            'bg-status-warning text-text-input-value': severity === 'medium',
            'bg-chart-yellow1 text-text-input-value': severity === 'low',
            'dark:bg-df-gray-500 bg-df-gray-600 text-text-input-value':
              !severity || severity === 'unknown',
          },
          iconClassName,
        )}
      ></div>
      {to ? (
        <DFLink to={to} unstyled>
          {upperFirst(severity)}
        </DFLink>
      ) : (
        <> {upperFirst(severity)}</>
      )}
    </div>
  );
};
