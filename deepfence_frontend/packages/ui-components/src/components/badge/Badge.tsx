import * as LabelPrimitive from '@radix-ui/react-label';
import cx from 'classnames';
import React, { ComponentProps, forwardRef, useId } from 'react';
import { twMerge } from 'tailwind-merge';

export type ColorType =
  | 'grey'
  | 'purple'
  | 'blue'
  | 'orange'
  | 'blueLight'
  | 'success'
  | 'info'
  | 'warning'
  | 'error';
export type SelectedBadgeProps = {
  id: string | number | undefined;
  value: string | number | undefined;
};
export interface BadgeProps extends Omit<ComponentProps<'span'>, 'ref' | 'color'> {
  label?: React.ReactNode;
  value?: string;
  color?: ColorType;
}

const classes = {
  label: {
    color: {
      grey: 'border-gray-600 border-2 text-text-inverse  dark:text-text-input-value ',
      purple: 'border-purple-600 border-2 text-text-inverse  dark:text-text-input-value ',
      blue: 'border-blue-600 border-2 text-text-inverse  dark:text-text-input-value ',
      orange: 'border-orange-600 border-2 text-text-inverse  dark:text-text-input-value ',
      blueLight:
        'border-clarity-action border-2 text-text-inverse  dark:text-text-input-value ',
      success: 'bg-status-success text-text-input-value dark:text-text-inverse',
      info: 'bg-status-info text-text-input-value dark:text-text-inverse',
      warning: 'bg-status-warning text-text-input-value dark:text-text-inverse',
      error: 'bg-status-error text-text-input-value dark:text-text-inverse',
    },
  },
  badge: {
    color: {
      grey: 'bg-gray-600  text-text-inverse dark:text-text-inverse ',
      purple: 'bg-purple-600  text-text-inverse dark:text-text-inverse',
      blue: 'bg-blue-600  text-text-inverse dark:text-text-inverse',
      orange: 'bg-orange-600  text-text-inverse dark:text-text-inverse',
      blueLight: 'bg-clarity-action text-text-inverse dark:text-text-inverse',
      success: 'bg-status-success text-text-inverse dark:text-text-inverse',
      info: 'bg-status-info text-text-inverse dark:text-text-inverse',
      warning: 'bg-status-warning text-text-inverse dark:text-text-inverse',
      error: 'bg-status-error text-text-inverse dark:text-text-inverse',
    },
  },
};

export const Badge = forwardRef<HTMLLabelElement, BadgeProps>(
  ({ label, id, color = 'grey', value, className, ...rest }, ref) => {
    const internalId = useId();
    const _id = id ? id : internalId;

    if (value && !label) {
      return (
        <LabelPrimitive.Label
          className={twMerge(
            cx(
              ` inline-flex gap-1.5 justify-center items-center px-3 rounded-full text-text-p6 ${classes.badge.color[color]}`,
            ),
            className,
          )}
          ref={ref}
          {...rest}
        >
          {value}
        </LabelPrimitive.Label>
      );
    }
    return (
      <>
        <LabelPrimitive.Label
          className={twMerge(
            cx(
              ` inline-flex gap-1.5 justify-center items-center pl-3 pr-1 rounded-full text-text-p6 ${classes.label.color[color]}`,
              {
                'pr-3': !value,
                'py-1': value,
              },
            ),
            className,
          )}
          id={_id}
          data-testid={`badge-${_id}`}
          ref={ref}
          {...rest}
        >
          {label}
          {value && (
            <LabelPrimitive.Label
              className={twMerge(
                cx(
                  ` inline-flex gap-1.5 justify-center items-center ml-4 px-3 rounded-full text-text-p6 ${classes.badge.color[color]}`,
                ),
              )}
            >
              {value}
            </LabelPrimitive.Label>
          )}
        </LabelPrimitive.Label>
      </>
    );
  },
);
Badge.displayName = 'Badge';
export default Badge;
