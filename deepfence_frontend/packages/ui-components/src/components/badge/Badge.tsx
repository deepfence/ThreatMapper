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
  | 'pink'
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
      grey: 'border-df-gray-600 dark:border-gray-600 border text-text-inverse  dark:text-text-input-value ',
      purple:
        'border-chart-purple1 dark:border-chart-purple1 border text-text-inverse  dark:text-text-input-value ',
      blue: 'border-accent-accent dark:border-accent-accent border text-text-inverse  dark:text-text-input-value ',
      orange:
        'border-status-warning dark:border-status-warning border text-text-inverse  dark:text-text-input-value ',
      blueLight:
        'border-clarity-action dark:border-clarity-action border text-text-inverse  dark:text-text-input-value ',
      pink: 'border-chart-pink3 dark:border-chart-pink3 border text-text-inverse  dark:text-text-input-value ',
      success:
        'bg-status-success dark:bg-status-success text-text-input-value dark:text-text-inverse',
      info: 'bg-status-info dark:bg-status-info text-text-input-value dark:text-text-inverse',
      warning:
        'bg-status-warning dark:bg-status-warning text-text-input-value dark:text-text-inverse',
      error:
        'bg-chart-red dark:bg-chart-red text-text-input-value dark:text-text-inverse',
    },
  },
  badge: {
    color: {
      grey: 'bg-df-gray-600 dark:bg-df-gray-600 text-text-inverse dark:text-text-inverse ',
      purple:
        'bg-chart-purple1 dark:border-chart-purple1 text-text-inverse dark:text-text-inverse',
      blue: 'bg-accent-accent dark:border-accent-accent  text-text-inverse dark:text-text-inverse',
      orange:
        'bg-status-warning dark:border-status-warning  text-text-inverse dark:text-text-inverse',
      blueLight:
        'bg-clarity-action dark:border-clarity-action text-text-inverse dark:text-text-inverse',
      pink: 'bg-chart-pink3 dark:bg-chart-pink3  text-text-inverse  dark:text-text-text-inverse ',
      success:
        'bg-status-success dark:bg-status-success text-text-inverse dark:text-text-inverse',
      info: 'bg-status-info dark:bg-status-info dark:text-text-inverse',
      warning:
        'bg-status-warning dark:bg-status-warning text-text-inverse dark:text-text-inverse',
      error: 'bg-chart-red dark:bg-chart-red text-text-inverse dark:text-text-inverse',
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
              ` inline-flex gap-1.5 justify-center items-center px-3 rounded-xl ${classes.badge.color[color]}`,
            ),
            'text-p8',
            'py-0.5',
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
              ` inline-flex gap-1.5 justify-center items-center pl-3 pr-1 rounded-xl ${classes.label.color[color]}`,
              {
                'pr-3': !value,
              },
              'text-p8',
              'py-0.5',
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
                  ` inline-flex gap-1.5 justify-center items-center ml-4 px-3  rounded-xl text-p8 ${classes.badge.color[color]}`,
                ),
                'text-p8',
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
