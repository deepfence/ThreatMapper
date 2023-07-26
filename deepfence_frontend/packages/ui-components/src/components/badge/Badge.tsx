import * as LabelPrimitive from '@radix-ui/react-label';
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

const badgeCVA = cva(['inline-block pt-0.5 min-w-[20px] text-center'], {
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
      outlined: 'text-text-inverse  dark:text-text-input-value border',
      filled: 'text-text-input-value dark:text-text-text-inverse',
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
      className: 'border-df-gray-600 dark:border-gray-600',
    },
    {
      variant: 'outlined',
      color: 'purple',
      className: 'border-chart-purple1 dark:border-chart-purple1',
    },
    {
      variant: 'outlined',
      color: 'blue',
      className: 'border-accent-accent dark:border-accent-accent',
    },
    {
      variant: 'outlined',
      color: 'orange',
      className: 'border-status-warning dark:border-status-warning',
    },
    {
      variant: 'outlined',
      color: 'blueLight',
      className: 'border-clarity-action dark:border-clarity-action',
    },
    {
      variant: 'outlined',
      color: 'pink',
      className: 'border-chart-pink3 dark:border-chart-pink3',
    },
    {
      variant: 'filled',
      color: 'grey',
      className: 'bg-df-gray-600 dark:bg-gray-600',
    },
    {
      variant: 'filled',
      color: 'purple',
      className: 'bg-chart-purple1 dark:bg-chart-purple1',
    },
    {
      variant: 'filled',
      color: 'blue',
      className: 'bg-accent-accent dark:bg-accent-accent',
    },
    {
      variant: 'filled',
      color: 'orange',
      className: 'bg-status-warning dark:bg-status-warning',
    },
    {
      variant: 'filled',
      color: 'blueLight',
      className: 'bg-clarity-action dark:bg-clarity-action dark:text-black',
    },
    {
      variant: 'filled',
      color: 'pink',
      className: 'bg-chart-pink3 dark:bg-chart-pink3',
    },
    {
      variant: 'filled',
      color: 'success',
      className: 'bg-status-success dark:bg-status-success',
    },
    {
      variant: 'filled',
      color: 'info',
      className: 'bg-status-info dark:bg-status-info',
    },
    {
      variant: 'filled',
      color: 'warning',
      className: 'bg-status-warning dark:bg-status-warning',
    },
    {
      variant: 'filled',
      color: 'error',
      className: 'bg-chart-red dark:bg-chart-red',
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
}

export const Badge = forwardRef<HTMLLabelElement, BadgeProps>(
  (
    {
      label,
      id,
      color = 'grey',
      size = 'default',
      variant = 'outlined',
      className,
      ...rest
    },
    ref,
  ) => {
    const internalId = useId();
    const _id = id ? id : internalId;
    return (
      <>
        <LabelPrimitive.Label
          className={cn(badgeCVA({ color, variant, size }), className)}
          id={_id}
          data-testid={`badge-${_id}`}
          ref={ref}
          {...rest}
        >
          {label}
        </LabelPrimitive.Label>
      </>
    );
  },
);
Badge.displayName = 'Badge';
export default Badge;
