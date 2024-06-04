import { upperFirst } from 'lodash-es';
import { cn } from 'tailwind-preset';

import { DFLink } from '@/components/DFLink';
import { SeverityCritical } from '@/components/icons/common/SeverityCritical';
import { SeverityHigh } from '@/components/icons/common/SeverityHigh';
import { SeverityLow } from '@/components/icons/common/SeverityLow';
import { SeverityMedium } from '@/components/icons/common/SeverityMedium';
import { SeverityScoreIcon } from '@/components/icons/common/SeverityScore';
import { SeverityUnknown } from '@/components/icons/common/SeverityUnknown';
import {
  getColorForCVSSScore,
  getPostureColor,
  getSeverityColorMap,
} from '@/constants/charts';
import { Mode, useTheme } from '@/theme/ThemeContext';
import { PostureSeverityType, VulnerabilitySeverityType } from '@/types/common';

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
          'bg-severity-unknown':
            !severity || severity === 'unknown' || severity === 'info',
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
        'flex items-center capitalize justify-center font-semibold leading-4 text-[11px] text-text-text-inverse py-0.5 max-w-[62px] min-w-[62px]',
        'bg-df-gray-500 rounded-[5px]',
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

export const PostureStatusBadgeIcon = ({
  theme,
  status,
  className,
}: {
  theme: Mode;
  status: PostureSeverityType;
  className?: string;
}) => {
  return (
    <div
      className={cn('w-[18px] h-[18px] shrink-0', className)}
      style={{ color: getPostureColor(theme)[status] }}
    >
      {status === 'alarm' && <SeverityCritical theme={theme} />}
      {status === 'info' && <SeverityHigh theme={theme} />}
      {status === 'ok' && <SeverityLow theme={theme} />}
      {status === 'skip' && <SeverityUnknown />}
      {status === 'pass' && <SeverityLow theme={theme} />}
      {status === 'warn' && <SeverityMedium theme={theme} />}
      {status === 'note' && <SeverityLow theme={theme} />}
      {status === 'delete' && <SeverityMedium theme={theme} />}
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
        'flex items-center gap-2 flex-nowrap text-p4 text-text-text-and-icon capitalize',
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
  theme,
  severity,
  className,
}: {
  severity: VulnerabilitySeverityType;
  className?: string;
  theme: Mode;
}) => {
  return (
    <div
      className={cn('w-[18px] h-[18px] shrink-0', className)}
      style={{ color: getSeverityColorMap(theme)[severity] }}
    >
      {severity === 'critical' && <SeverityCritical theme={theme} />}
      {severity === 'high' && <SeverityHigh theme={theme} />}
      {severity === 'medium' && <SeverityMedium theme={theme} />}
      {severity === 'low' && <SeverityLow theme={theme} />}
      {(!severity || severity === 'unknown') && <SeverityUnknown />}
    </div>
  );
};
