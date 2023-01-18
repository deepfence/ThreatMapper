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
    'rounded-lg focus:outline-none select-none',
    'rounded-lg focus:outline-none select-none',
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
          'bg-gray-200  hover:bg-gray-300 ',
          // text styles
          'text-gray-800 hover:text-gray-900 ',
          // focus styles
          'focus:ring-2 focus:ring-gray-100',
        ],
        primary: [
          // bg styles
          'bg-blue-700 hover:bg-blue-800',
          // text styles
          'text-white',
          // focus styles
          'focus:ring-2 focus:ring-blue-200',
        ],
        danger: [
          // bg styles
          'bg-red-700 hover:bg-red-800',
          // text styles
          'text-white',
          // focus styles
          'focus:ring-2 focus:ring-red-200',
        ],
        success: [
          // bg styles
          'bg-green-700 hover:bg-green-800',
          // text styles
          'text-white',
          // focus styles
          'focus:ring-2 focus:ring-green-200',
        ],
        normal: [
          // bg styles
          'bg-white hover:bg-gray-300  ',
          // text styles
          'text-gray-800 hover:text-gray-800 focus:text-gray-800 ',
          // focus styles
          'dark:ring-gray-100 focus:ring-2 focus:ring-gray-100',
        ],
      },
      pill: {
        true: 'rounded-full',
      },
      withOutline: {
        true: 'bg-white',
      },
    },
    defaultVariants: {
      color: 'default',
      size: 'md',
    },
    compoundVariants: [
      {
        color: 'default',
        withOutline: true,
        className: [
          // bg styles
          'bg-transparent hover:bg-gray-300 ',
          // text styles
          'text-gray-900  dark:text-white hover:text-black dark:hover:text-black',
          // ring styles
          'ring-1 ring-gray-900 focus:ring-1 focus:ring-gray-200 dark:ring-white',
        ],
      },
      {
        color: 'primary',
        withOutline: true,
        className: [
          // bg styles
          'hover:bg-blue-800',
          // text styles
          'text-blue-700 hover:text-white',
          // ring styles
          'ring-1 ring-blue-700 focus:ring-2 focus:ring-blue-200',
        ],
      },
      {
        color: 'danger',
        withOutline: true,
        className: [
          // bg styles
          'hover:bg-red-800',
          // text styles
          'text-red-700 hover:text-white',
          // ring styles
          'ring-1 focus:ring-2 ring-red-700 focus:ring-red-200',
        ],
      },
      {
        color: 'success',
        withOutline: true,
        className: [
          // bg styles
          'hover:bg-green-800',
          // text styles
          ' text-green-700 hover:text-white',
          // ring styles
          'ring-1 ring-green-700 focus:ring-2 focus:ring-green-200',
        ],
      },
      {
        color: 'normal',
        withOutline: true,
        className: [
          // bg styles
          'dark:bg-gray-800 hover:bg-gray-100 hover:dark:bg-gray-700',
          // text styles
          'text-gray-700 dark:text-gray-400 hover:text-gray-900 focus:text-gray-900',
          // ring styles
          'ring-1 focus:ring-2 focus:ring-gray-200 dark:ring-gray-600 ring-gray-200',
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
    <IconContext.Provider
      data-testid={`button-icon-start-${id}`}
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
  );
};

const EndIcon = ({ id, size, startIcon, endIcon }: IconProps) => {
  return (
    <IconContext.Provider
      data-testid={`button-icon-end-${id}`}
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
