import cx from 'classnames';
import React, { ComponentProps } from 'react';

import { Typography } from '../typography/Typography';

export type ButtonShape = 'default';
export type ColorType = 'default' | 'primary' | 'danger' | 'success';
export type SizeType = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<ComponentProps<'button'>, 'className' | 'color'> {
  size?: SizeType;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  shape?: ButtonShape;
  outline?: boolean;
  color?: ColorType;
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
      'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-900 focus:text-gray-900 focus:ring-2 focus:ring-gray-100',
    primary: 'bg-blue-600 text-white hover:bg-blue-800 focus:ring-2 focus:ring-blue-500',
    danger: 'bg-red-500 text-white hover:bg-red-800 focus:ring-2 focus:ring-red-300',
    success:
      'bg-green-500 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-300',
  },
  outline: {
    default:
      'bg-white text-gray-800 ring-1 ring-gray-900 hover:bg-gray-800 hover:text-white focus:ring-2 focus:ring-gray-200',
    primary:
      'bg-white ring-1 ring-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white focus:ring-2 focus:ring-blue-300',
    danger:
      'text-red-600 ring-1 ring-red-600 hover:bg-red-700 hover:text-white focus:ring-2 focus:ring-red-300',
    success:
      'text-green-500 ring-1 ring-green-500  hover:bg-green-500 hover:text-white focus:ring-2 focus:ring-green-300',
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
    { children, size = 'md', color, disabled, outline, startIcon, endIcon, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cx(
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

            [classes.disabled]: disabled,
            'dark:text-white dark:bg-gray-900 dark:hover:bg-gray-800 dark:focus:ring-2 dark:focus:ring-gray-400':
              outline,
          },
        )}
        {...props}
      >
        {startIcon && <span className={cx(classes.startIcon[size])}>{startIcon}</span>}
        {children}
        {endIcon && <span className={cx(classes.endIcon[size])}>{endIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
