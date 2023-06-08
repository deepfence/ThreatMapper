import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, VariantProps } from 'cva';
import React, { ComponentProps, forwardRef, useId } from 'react';
import { twMerge } from 'tailwind-merge';

import { ObjectWithNonNullableValues } from '@/types/utils';

export type SizeType = 'default' | 'small';
export type VariantType = 'outline' | 'flat';

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

const badgeCVA = cva(['py-px'], {
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
      outline: 'text-text-inverse  dark:text-text-input-value border',
      flat: 'text-text-input-value dark:text-text-inverse',
    },
    size: {
      default: 'text-p8 px-2.5 rounded-xl',
      small: 'text-p9 px-1 rounded-lg align-middle',
    },
  },
  defaultVariants: {
    color: 'grey',
    size: 'default',
    variant: 'outline',
  },
  compoundVariants: [
    {
      variant: 'outline',
      color: 'grey',
      className: 'border-df-gray-600 dark:border-gray-600',
    },
    {
      variant: 'outline',
      color: 'purple',
      className: 'border-chart-purple1 dark:border-chart-purple1',
    },
    {
      variant: 'outline',
      color: 'blue',
      className: 'border-accent-accent dark:border-accent-accent',
    },
    {
      variant: 'outline',
      color: 'orange',
      className: 'border-status-warning dark:border-status-warning',
    },
    {
      variant: 'outline',
      color: 'blueLight',
      className: 'border-clarity-action dark:border-clarity-action',
    },
    {
      variant: 'outline',
      color: 'pink',
      className: 'border-chart-pink3 dark:border-chart-pink3',
    },
    {
      variant: 'flat',
      color: 'grey',
      className: 'bg-df-gray-600 dark:bg-gray-600',
    },
    {
      variant: 'flat',
      color: 'purple',
      className: 'bg-chart-purple1 dark:bg-chart-purple1',
    },
    {
      variant: 'flat',
      color: 'blue',
      className: 'bg-accent-accent dark:bg-accent-accent',
    },
    {
      variant: 'flat',
      color: 'orange',
      className: 'bg-status-warning dark:bg-status-warning',
    },
    {
      variant: 'flat',
      color: 'blueLight',
      className: 'bg-clarity-action dark:bg-clarity-action',
    },
    {
      variant: 'flat',
      color: 'pink',
      className: 'bg-chart-pink3 dark:bg-chart-pink3',
    },
    {
      variant: 'flat',
      color: 'success',
      className: 'bg-status-success dark:bg-status-success',
    },
    {
      variant: 'flat',
      color: 'info',
      className: 'bg-status-info dark:bg-status-info',
    },
    {
      variant: 'flat',
      color: 'warning',
      className: 'bg-status-warning dark:bg-status-warning',
    },
    {
      variant: 'flat',
      color: 'error',
      className: 'bg-chart-red dark:bg-chart-red',
    },
    {
      variant: 'flat',
      size: 'default',
      className: 'py-0.5',
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
      variant = 'outline',
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
          className={twMerge(badgeCVA({ color, variant, size }), className)}
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
