import { cva, VariantProps } from 'cva';
import React, { ComponentProps, forwardRef, useId } from 'react';
import { cn } from 'tailwind-preset';

import { ObjectWithNonNullableValues } from '@/types/utils';

export type SizeType = 'default' | 'small';
export type VariantType = 'outlined' | 'filled';

export type ColorType =
  | 'grey'
  | 'purple'
  | 'blue'
  | 'orange'
  | 'blueLight'
  | 'pink'
  | 'success'
  | 'info'
  | 'warning'
  | 'error';

const badgeCVA = cva(['flex items-center gap-2 min-w-[20px] justify-center'], {
  variants: {
    color: {
      grey: '',
      purple: '',
      blue: '',
      orange: '',
      blueLight: '',
      pink: '',
      success: '',
      info: '',
      warning: '',
      error: '',
    },
    variant: {
      outlined: 'text-text-input-value border',
      filled: 'text-text-text-inverse',
    },
    size: {
      default: 'text-p8 px-2.5 rounded-xl ',
      small: 'text-p9 px-1 rounded-lg h-[15px]',
    },
  },
  defaultVariants: {
    color: 'grey',
    size: 'default',
    variant: 'outlined',
  },
  compoundVariants: [
    {
      variant: 'outlined',
      color: 'grey',
      className: 'border-df-gray-400 dark:border-gray-600',
    },
    {
      variant: 'outlined',
      color: 'purple',
      className: 'border-chart-purple1',
    },
    {
      variant: 'outlined',
      color: 'blue',
      className: 'border-accent-accent',
    },
    {
      variant: 'outlined',
      color: 'orange',
      className: 'border-status-warning',
    },
    {
      variant: 'outlined',
      color: 'blueLight',
      className: 'border-clarity-action',
    },
    {
      variant: 'outlined',
      color: 'pink',
      className: ':border-chart-pink3',
    },
    {
      variant: 'filled',
      color: 'grey',
      className: 'bg-df-gray-400 dark:bg-gray-600',
    },
    {
      variant: 'filled',
      color: 'purple',
      className: 'bg-chart-purple1',
    },
    {
      variant: 'filled',
      color: 'blue',
      className: 'bg-accent-accent',
    },
    {
      variant: 'filled',
      color: 'orange',
      className: 'bg-status-warning',
    },
    {
      variant: 'filled',
      color: 'blueLight',
      className: 'bg-text-link dark:text-text-text-inverse',
    },
    {
      variant: 'filled',
      color: 'pink',
      className: 'bg-chart-pink3',
    },
    {
      variant: 'filled',
      color: 'success',
      className: 'bg-status-success',
    },
    {
      variant: 'filled',
      color: 'info',
      className: 'bg-status-info',
    },
    {
      variant: 'filled',
      color: 'warning',
      className: 'bg-status-warning',
    },
    {
      variant: 'filled',
      color: 'error',
      className: 'bg-chart-red',
    },
    {
      variant: 'filled',
      size: 'default',
      className: 'pt-[3px] pb-px',
    },
  ],
});
export interface BadgeProps
  extends Omit<ComponentProps<'span'>, 'ref' | 'color'>,
    ObjectWithNonNullableValues<VariantProps<typeof badgeCVA>> {
  label?: React.ReactNode;
  color?: ColorType;
  size?: SizeType;
  variant?: VariantType;
  endIcon?: React.ReactNode;
  startIcon?: React.ReactNode;
  onStartIconClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onEndIconClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

const NormalIconClass = 'w-4 h-4';
const SmallIconClass = 'w-3 h-3';

export const Badge = forwardRef<HTMLLabelElement, BadgeProps>(
  (
    {
      label,
      id,
      color = 'grey',
      size = 'default',
      variant = 'outlined',
      className,
      startIcon,
      endIcon,
      onEndIconClick,
      onStartIconClick,
      ...rest
    },
    ref,
  ) => {
    const internalId = useId();
    const _id = id ? id : internalId;
    return (
      <span className="inline-block">
        <div className={cn(badgeCVA({ color, variant, size }), className)}>
          {startIcon ? (
            <ButtonOrText
              content={startIcon}
              onClick={onStartIconClick}
              className={size === 'default' ? NormalIconClass : SmallIconClass}
            />
          ) : null}
          <label id={_id} data-testid={`badge-${_id}`} ref={ref} {...rest}>
            {label}
          </label>
          {endIcon ? (
            <ButtonOrText
              content={endIcon}
              onClick={onEndIconClick}
              className={size === 'default' ? NormalIconClass : SmallIconClass}
            />
          ) : null}
        </div>
      </span>
    );
  },
);

const ButtonOrText = ({
  content,
  onClick,
  className,
}: {
  content: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}) => {
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  } else {
    return <div className={className}>{content}</div>;
  }
};

Badge.displayName = 'Badge';
export default Badge;
