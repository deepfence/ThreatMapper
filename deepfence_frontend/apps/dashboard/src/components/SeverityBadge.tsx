import { upperFirst } from 'lodash-es';
import { cn } from 'tailwind-preset';

import { DFLink } from '@/components/DFLink';
import { SeverityCritical } from '@/components/icons/common/SeverityCritical';
import { SeverityHigh } from '@/components/icons/common/SeverityHigh';
import { SeverityLow } from '@/components/icons/common/SeverityLow';
import { SeverityMedium } from '@/components/icons/common/SeverityMedium';
import { SeverityScoreIcon } from '@/components/icons/common/SeverityScore';
import { SeverityUnknown } from '@/components/icons/common/SeverityUnknown';
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
        'flex items-center capitalize justify-center font-semibold leading-4 text-[11px] text-text-text-inverse py-0.5 max-w-[62px] min-w-[62px]',
        ' rounded-[5px]',
        {
          'bg-severity-critical': severity === 'critical',
          'bg-severity-high': severity === 'high',
          'bg-severity-medium': severity === 'medium',
          'bg-severity-low': severity === 'low',
          'bg-severity-unknown': !severity || severity === 'unknown',
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
        'flex items-center gap-2 flex-nowrap text-p7 text-text-icon capitalize',
        className,
      )}
    >
      <div
        className={cn(
          'rounded-full h-3 w-3 shrink-0',
          {
            'bg-severity-critical': severity === 'critical',
            'bg-severity-high': severity === 'high',
            'bg-severity-medium': severity === 'medium',
            'bg-severity-low': severity === 'low',
            'bg-severity-unknown': !severity || severity === 'unknown',
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

export const SeverityBadgeIcon = ({
  severity,
  className,
}: {
  severity: string;
  className?: string;
}) => {
  return (
    <div className={cn('w-[18px] h-[18px]', className)}>
      {severity === 'critical' && <SeverityCritical />}
      {severity === 'high' && <SeverityHigh />}
      {severity === 'medium' && <SeverityMedium />}
      {severity === 'low' && <SeverityLow />}
      {!severity || (severity === 'unknown' && <SeverityUnknown />)}
    </div>
  );
};
