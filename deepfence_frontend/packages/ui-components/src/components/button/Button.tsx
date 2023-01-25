import { cva, VariantProps } from 'cva';
import React, { ComponentProps, useId } from 'react';
import { IconContext } from 'react-icons';
import { twMerge } from 'tailwind-merge';

import { ObjectWithNonNullableValues } from '@/types/utils';

export type ColorType = 'default' | 'primary' | 'danger' | 'success' | 'normal';
export type SizeType = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const buttonCva = cva(
  [
    'font-medium',
    'disabled:cursor-not-allowed',
    'flex flex-row items-center justify-center',
    'focus:outline-none select-none',
  ],
  {
    variants: {
      size: {
        xs: 'text-xs px-3 py-2',
        sm: 'text-sm px-3 py-2',
        md: 'text-base px-5 py-2.5',
        lg: 'text-lg px-5 py-3',
        xl: 'text-xl px-6 py-3.5',
      },
      color: {
        default: [
          // bg styles
          'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700',
          // text styles
          'text-gray-900 dark:text-gray-400 dark:hover:text-white',
          // focus styles
          'focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700',
        ],
        primary: [
          // bg styles
          'bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700',
          // text styles
          'text-white',
          // focus styles
          'focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800',
        ],
        danger: [
          // bg styles
          'bg-red-700 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700',
          // text styles
          'text-white',
          // focus styles
          'focus:ring-4 focus:ring-red-300 dark:focus:ring-red-900',
        ],
        success: [
          // bg styles
          'bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700',
          // text styles
          'text-white',
          // focus styles
          'focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800',
        ],
        normal: [
          // bg styles
          'bg-white hover:bg-gray-100 dark:bg-transparent dark:hover:bg-gray-800',
          // text styles
          'text-gray-700 dark:text-gray-200',
          // focus styles
          'focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-800',
        ],
      },
      pill: {
        true: 'rounded-full',
        false: 'rounded-lg',
      },
      withOutline: {
        true: 'bg-white',
      },
    },
    defaultVariants: {
      color: 'default',
      size: 'md',
      pill: false,
    },
    compoundVariants: [
      {
        color: 'default',
        withOutline: true,
        className: [
          // bg styles
          'bg-transparent hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700',
          // text styles
          'text-gray-900 hover:text-blue-700 dark:text-gray-400 dark:hover:text-white',
          // border styles
          'border border-gray-200 dark:border-gray-600',
          // ring styles
          'focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700',
        ],
      },
      {
        color: 'primary',
        withOutline: true,
        className: [
          // bg styles
          'dark:bg-transparent hover:bg-blue-800 dark:hover:bg-blue-600',
          // text styles
          'text-blue-700 hover:text-white dark:text-blue-500 dark:hover:text-white',
          // border styles
          'border border-blue-700 dark:border-blue-500',
          // ring styles
          'focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800',
        ],
      },
      {
        color: 'danger',
        withOutline: true,
        className: [
          // bg styles
          'dark:bg-transparent hover:bg-red-800 dark:hover:bg-red-600',
          // text styles
          'text-red-700 hover:text-white dark:text-red-500 dark:hover:text-white',
          // border styles
          'border border-red-700 dark:border-red-500',
          // ring styles
          'focus:ring-4 focus:ring-red-300 dark:focus:ring-red-900',
        ],
      },
      {
        color: 'success',
        withOutline: true,
        className: [
          // bg styles
          'dark:bg-transparent hover:bg-green-800 dark:hover:bg-green-600',
          // text styles
          'text-green-700 hover:text-white dark:text-green-500 dark:hover:text-white',
          // border styles
          'border border-green-700 dark:border-green-500',
          // ring styles
          'focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800',
        ],
      },
      {
        color: 'normal',
        withOutline: true,
        className: [
          // bg styles
          'bg-transparent hover:bg-gray-100 hover:dark:bg-gray-700',
          // text styles
          'text-gray-700 dark:text-gray-400 hover:text-gray-900 focus:text-gray-900',
          // ring styles
          'focus:ring-4 focus:ring-gray-100 dark:ring-gray-800',
        ],
      },
    ],
  },
);

interface ButtonProps
  extends Omit<ComponentProps<'button'>, 'color'>,
    ObjectWithNonNullableValues<Omit<VariantProps<typeof buttonCva>, 'withOutline'>> {
  size?: SizeType;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  outline?: boolean;
  color?: ColorType;
  className?: string;
}

const iconCva = cva('', {
  variants: {
    size: {
      xs: 'w-3 h-3',
      sm: 'w-3.5 h-3.5',
      md: 'w-4.5 h-4.5',
      lg: 'w-5.5 h-5.5',
      xl: 'w-5.5 h-5.5',
    },
    withStartIcon: {
      true: '',
    },
    withEndIcon: {
      true: '',
    },
  },
  compoundVariants: [
    {
      size: ['xs', 'sm'],
      withStartIcon: true,
      className: 'mr-[10.4px]',
    },
    {
      size: 'md',
      withStartIcon: true,
      className: 'mr-[11px]',
    },
    {
      size: ['lg', 'xl'],
      withStartIcon: true,
      className: 'mr-[15px]',
    },
    {
      size: ['xs', 'sm'],
      withEndIcon: true,
      className: 'ml-[10.4px]',
    },
    {
      size: 'md',
      withEndIcon: true,
      className: 'ml-[11px]',
    },
    {
      size: ['lg', 'xl'],
      withEndIcon: true,
      className: 'ml-[15px]',
    },
    {
      size: ['xs', 'sm'],
      withStartIcon: true,
      withEndIcon: true,
      className: 'mr-[10.4px] ml-[10.4px]',
    },
    {
      size: 'md',
      withStartIcon: true,
      withEndIcon: true,
      className: 'mr-[11px] ml-[11px]',
    },
    {
      size: ['lg', 'xl'],
      withStartIcon: true,
      withEndIcon: true,
      className: 'mr-[15px] ml-[15px]',
    },
  ],
});

interface IconProps extends VariantProps<typeof iconCva> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  id?: string;
}

const StartIcon = ({ id, startIcon, endIcon, size }: IconProps) => {
  return (
    <span data-testid={`button-icon-start-${id}`}>
      <IconContext.Provider
        value={{
          className: iconCva({
            size,
            withStartIcon: !!startIcon,
            withEndIcon: !!endIcon,
          }),
        }}
      >
        {startIcon}
      </IconContext.Provider>
    </span>
  );
};

const EndIcon = ({ id, size, startIcon, endIcon }: IconProps) => {
  return (
    <span data-testid={`button-icon-end-${id}`}>
      <IconContext.Provider
        value={{
          className: iconCva({
            size,
            withStartIcon: !!startIcon,
            withEndIcon: !!endIcon,
          }),
        }}
      >
        {endIcon}
      </IconContext.Provider>
    </span>
  );
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
      pill,
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
          buttonCva({
            size,
            color,
            withOutline: outline,
            pill,
          }),
          className,
        )}
        {...props}
      >
        {startIcon && (
          <StartIcon startIcon={startIcon} endIcon={endIcon} id={_id} size={size} />
        )}
        {children}
        {endIcon && (
          <EndIcon startIcon={startIcon} endIcon={endIcon} id={_id} size={size} />
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
