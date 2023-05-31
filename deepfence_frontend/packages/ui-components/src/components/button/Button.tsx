import cx from 'classnames';
import { cva, VariantProps } from 'cva';
import React, { ComponentProps, useId } from 'react';
import { IconContext } from 'react-icons';
import { twMerge } from 'tailwind-merge';

import { CircleSpinner } from '@/main';
import { ObjectWithNonNullableValues } from '@/types/utils';

export type ColorType = 'default' | 'primary' | 'danger' | 'success' | 'normal';
export type SizeType = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const Loader = ({
  color,
  size,
  outline,
}: {
  color?: ColorType;
  size?: SizeType;
  outline?: boolean;
}) => {
  return (
    <CircleSpinner
      size={size}
      className={twMerge(
        cva([], {
          variants: {
            color: {
              primary: 'fill-gray-100 dark:text-gray-300',
              default: 'fill-gray-400 dark:text-gray-600',
              danger: 'fill-gray-100 dark:text-gray-400',
              success: 'fill-gray-100 dark:text-gray-400',
              normal: 'fill-gray-100 dark:text-gray-400',
            },
            withOutline: {
              true: '',
            },
          },
          defaultVariants: {
            color: 'default',
          },
          compoundVariants: [
            {
              withOutline: true,
              color: 'primary',
              className: 'fill-blue-600 text-blue-200 dark:text-blue-400',
            },
            {
              withOutline: true,
              color: 'danger',
              className: 'fill-red-600 text-red-200 dark:text-red-400',
            },
            {
              withOutline: true,
              color: 'success',
              className: 'fill-green-600 text-green-200 dark:text-green-400',
            },
            {
              withOutline: true,
              color: 'normal',
              className: 'fill-gray-600 text-gray-200 dark:text-gray-400',
            },
          ],
        })({ color, withOutline: outline }),
      )}
    />
  );
};
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
        xxs: 'text-xs px-2 py-1',
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
          'text-gray-700 dark:text-gray-400 dark:hover:text-white',
          // focus styles
          'focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700',
          // disabled styles
          'disabled:opacity-50 dark:disabled:bg-gray-800 disabled:hover:bg-gray-100 dark:disabled:hover:bg-gray-800 disabled:dark:text-gray-400',
        ],
        primary: [
          // bg styles
          'bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700',
          // text styles
          'text-white',
          // focus styles
          'focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800',
          // disabled styles
          'disabled:bg-blue-400 dark:disabled:bg-blue-500 disabled:hover:bg-blue-400 dark:disabled:hover:bg-blue-500',
        ],
        danger: [
          // bg styles
          'bg-red-700 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700',
          // text styles
          'text-white',
          // focus styles
          'focus:ring-4 focus:ring-red-300 dark:focus:ring-red-900',
          // disabled styles
          'disabled:bg-red-400 dark:disabled:bg-red-500 disabled:hover:bg-red-400 dark:disabled:hover:bg-red-500',
        ],
        success: [
          // bg styles
          'bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700',
          // text styles
          'text-white',
          // focus styles
          'focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800',
          // disabled styles
          'disabled:bg-green-400 dark:disabled:bg-green-500 disabled:hover:bg-green-400 dark:disabled:hover:bg-green-500',
        ],
        normal: [
          // bg styles
          'bg-white hover:bg-gray-100 dark:bg-transparent dark:hover:bg-gray-800',
          // text styles
          'text-gray-700 dark:text-gray-200',
          // focus styles
          'focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-800',
          // disabled styles
          'disabled:text-gray-400 dark:disabled:text-gray-600 disabled:hover:bg-white dark:disabled:hover:bg-gray-900',
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
          // disabled styles
          'disabled:bg-transparent disabled:hover:bg-transparent disabled:opacity-50 disabled:hover:text-gray-900',
          'dark:disabled:bg-transparent dark:disabled:hover:bg-transparent dark:disabled:hover:text-gray-400',
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
          // disabled styles
          'disabled:bg-transparent disabled:hover:bg-transparent disabled:opacity-50 disabled:hover:text-blue-700',
          'dark:disabled:bg-transparent dark:disabled:hover:bg-transparent dark:disabled:hover:text-blue-500',
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
          // disabled styles
          'disabled:bg-transparent disabled:hover:bg-transparent disabled:opacity-50 disabled:hover:text-red-700',
          'dark:disabled:bg-transparent dark:disabled:hover:bg-transparent dark:disabled:hover:text-red-500',
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
          // disabled styles
          'disabled:bg-transparent disabled:hover:bg-transparent disabled:opacity-50 disabled:hover:text-green-700',
          'dark:disabled:bg-transparent dark:disabled:hover:bg-transparent dark:disabled:hover:text-green-500',
        ],
      },
      {
        color: 'normal',
        withOutline: true,
        className: [
          // bg styles
          'bg-transparent hover:bg-gray-100 hover:dark:bg-gray-800',
          // text styles
          'text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300',
          // ring styles
          'focus:ring-4 focus:ring-gray-100 dark:ring-gray-800',
          // disabled styles
          'disabled:opacity-75 dark:disabled:opacity-100 dark:disabled:text-gray-600 disabled:hover:bg-transparent',
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
  loading?: boolean;
}

const iconCva = cva('', {
  variants: {
    size: {
      xxs: 'w-3 h-3',
      xs: 'w-3 h-3',
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-[18px] h-[18px]',
      xl: 'w-5 h-5',
    },
    withStartIcon: {
      true: '',
    },
    withEndIcon: {
      true: '',
    },
    withLoader: {
      true: '',
    },
  },
  compoundVariants: [
    {
      size: ['xxs'],
      withStartIcon: true,
      className: 'mr-[4px]',
    },
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
      size: ['xxs'],
      withLoader: true,
      className: 'mr-[4px]',
    },
    {
      size: ['xs', 'sm'],
      withLoader: true,
      className: 'mr-[10.4px]',
    },
    {
      size: 'md',
      withLoader: true,
      className: 'mr-[11px]',
    },
    {
      size: ['lg', 'xl'],
      withLoader: true,
      className: 'mr-[15px]',
    },
    {
      size: ['xxs'],
      withEndIcon: true,
      className: 'ml-[4px]',
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
  size?: SizeType;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  id?: string;
  loading?: boolean;
  outline?: boolean;
  color?: ColorType;
}

const iconLoaderCva = cva('flex justify-center');
const StartIcon = ({
  id,
  startIcon,
  endIcon,
  loading,
  color,
  outline,
  size,
}: IconProps) => {
  return (
    <div data-testid={`button-icon-start-${id}`}>
      {loading ? (
        <div
          className={cx(
            iconLoaderCva({}),
            iconCva({
              size,
              withStartIcon: !!startIcon,
              withEndIcon: !!endIcon,
            }),
          )}
        >
          <Loader color={color} size={size} outline={outline} />
        </div>
      ) : (
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
      )}
    </div>
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
      loading,
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
          <StartIcon
            startIcon={startIcon}
            endIcon={endIcon}
            id={_id}
            size={size}
            loading={loading}
            color={color}
          />
        )}
        {loading && !startIcon ? (
          <div
            className={cx(
              iconLoaderCva({}),
              iconCva({
                size,
                withStartIcon: false,
                withEndIcon: !!endIcon,
                withLoader: true,
              }),
            )}
          >
            <Loader color={color} size={size} outline={outline} />
          </div>
        ) : null}
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
