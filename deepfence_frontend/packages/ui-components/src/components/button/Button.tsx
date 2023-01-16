import cx from 'classnames';
import React, { ComponentProps, useId } from 'react';
import { twMerge } from 'tailwind-merge';

import { Typography } from '@/components/typography/Typography';

export type ButtonShape = 'default';
export type ColorType = 'default' | 'primary' | 'danger' | 'success' | 'normal';
export type SizeType = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<ComponentProps<'button'>, 'color'> {
  size?: SizeType;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  shape?: ButtonShape;
  outline?: boolean;
  color?: ColorType;
  className?: string;
}

export const classes = {
  disabled: 'cursor-not-allowed',
  pill: 'rounded-full',
  size: {
    xs: `${Typography.size.xs} px-3 py-2`,
    sm: `${Typography.size.sm} px-3 py-2`,
    md: `${Typography.size.base} px-5 py-2.5`,
    lg: `${Typography.size.lg} px-5 py-3`,
    xl: `${Typography.size.xl} px-6 py-3.5`,
  },
  color: {
    default:
      'bg-gray-200 text-gray-800 hover:bg-gray-300 hover:text-gray-900 focus:ring-2 focus:ring-gray-100',
    primary: 'bg-blue-700 text-white hover:bg-blue-800 focus:ring-2 focus:ring-blue-200',
    danger: 'bg-red-700 text-white hover:bg-red-800 focus:ring-2 focus:ring-red-200',
    success:
      'bg-green-700 text-white hover:bg-green-800 focus:ring-2 focus:ring-green-200',
    normal:
      'bg-white hover:bg-gray-300 text-gray-800 hover:text-gray-800 dark:ring-gray-100 focus:text-gray-800 focus:ring-2 focus:ring-gray-100',
  },
  outline: {
    default:
      'bg-white text-gray-800 ring-1 ring-gray-900 hover:bg-gray-800 hover:text-white focus:ring-1 focus:ring-gray-200 dark:ring-white',
    primary:
      'bg-white ring-1 ring-blue-700 text-blue-700 hover:bg-blue-800 hover:text-white focus:ring-2 focus:ring-blue-200',
    danger:
      'text-red-700 ring-1 ring-red-700 hover:bg-red-800 hover:text-white focus:ring-2 focus:ring-red-200',
    success:
      'text-green-700 ring-1 ring-green-700  hover:bg-green-800 hover:text-white focus:ring-2 focus:ring-green-200',
    normal:
      'bg-white dark:bg-gray-800 ring-1 ring-gray-200  hover:bg-gray-100 hover:dark:bg-gray-700 text-gray-700 dark:text-gray-400 hover:text-gray-900 focus:text-gray-900 focus:ring-2 focus:ring-gray-200 focus:ring-gray-600 dark:ring-gray-600',
  },
  startIcon: {
    xs: 'mr-[10.4px]',
    sm: 'mr-[10.4px]',
    md: 'mr-[11px]',
    lg: 'mr-[15px]',
    xl: 'mr-[15px]',
  },
  endIcon: {
    xs: 'ml-[10.4px]',
    sm: 'ml-[10.4px]',
    md: 'ml-[11px]',
    lg: 'ml-[15px]',
    xl: 'ml-[15px]',
  },
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      id,
      size = 'md',
      color,
      disabled,
      outline,
      startIcon,
      endIcon,
      className,
      ...props
    },
    ref,
  ) => {
    const internalId = useId();
    const _id = id ? id : internalId;

    return (
      <button
        ref={ref}
        id={_id}
        data-testid={`button-${_id}`}
        disabled={disabled}
        className={twMerge(
          cx(
            'flex flex-row items-center justify-center',
            `${Typography.weight.medium}`,
            `${classes.size[size]}`,
            'rounded-lg focus:outline-none select-none',
            {
              [classes.color.primary]: color === 'primary' && !outline,
              [classes.outline.primary]: outline && color === 'primary',

              [classes.color.default]:
                (color === undefined && !outline) || (color === 'default' && !outline),
              [classes.outline.default]:
                (color === undefined && outline) || (color === 'default' && outline),

              [classes.color.danger]: color === 'danger' && !outline,
              [classes.outline.danger]: color === 'danger' && outline,

              [classes.color.success]: color === 'success' && !outline,
              [classes.outline.success]: color === 'success' && outline,

              [classes.color.normal]: color === 'normal' && !outline,
              [classes.outline.normal]: color === 'normal' && outline,

              [classes.disabled]: disabled,
            },
          ),
          className,
        )}
        {...props}
      >
        {startIcon && (
          <span
            className={cx(classes.startIcon[size])}
            data-testid={`button-icon-start-${_id}`}
          >
            {startIcon}
          </span>
        )}
        {children}
        {endIcon && (
          <span
            className={cx(classes.endIcon[size])}
            data-testid={`button-icon-end-${_id}`}
          >
            {endIcon}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
