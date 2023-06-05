import cx from 'classnames';
import { cva, VariantProps } from 'cva';
import React, { ComponentProps, useId } from 'react';
import { IconContext } from 'react-icons';
import { twMerge } from 'tailwind-merge';

import { CircleSpinner } from '@/main';
import { ObjectWithNonNullableValues } from '@/types/utils';

export type ColorType = 'default' | 'error' | 'success';
export type SizeType = 'lg' | 'md' | 'sm';
export type VariantType = 'outline' | 'flat';

export const Loader = ({
  color,
  size,
  variant,
}: {
  color?: ColorType;
  size?: SizeType;
  variant?: VariantType;
}) => {
  return (
    <CircleSpinner
      size={size}
      className={twMerge(
        cva([], {
          variants: {
            color: {
              default: 'dark:text-bg-active-selection',
              error: 'fill-gray-100 dark:text-gray-400',
              success: 'fill-gray-100 dark:text-gray-400',
            },
            variant: {
              outline: '',
              flat: '',
            },
          },
          defaultVariants: {
            color: 'default',
          },
          compoundVariants: [
            {
              variant: 'outline',
              color: 'default',
              className: 'dark:text-bg-active-selection fill-accent-accent',
            },
            {
              variant: 'outline',
              color: 'error',
              className: 'fill-red-600 text-red-200 dark:text-red-400',
            },
            {
              variant: 'outline',
              color: 'success',
              className: 'fill-green-600 text-green-200 dark:text-green-400',
            },
            {
              variant: 'flat',
              color: 'default',
              className: 'fill-blue-600 text-blue-200 dark:text-blue-400',
            },
            {
              variant: 'flat',
              color: 'error',
              className: 'fill-red-600 text-red-200 dark:text-red-400',
            },
            {
              variant: 'flat',
              color: 'success',
              className: 'fill-green-600 text-green-200 dark:text-green-400',
            },
          ],
        })({ color, variant }),
      )}
    />
  );
};
export const buttonCva = cva(
  [
    'font-normal',
    'disabled:cursor-not-allowed',
    'flex flex-row items-center justify-center',
    'focus:outline-none select-none',
  ],
  {
    variants: {
      size: {
        sm: 'text-p8 px-3 py-1',
        md: 'text-p8 px-3 py-[7px]',
        lg: 'text-p8 px-3 py-2.5',
      },
      color: {
        default: [
          // bg styles
          'bg-gray-100 dark:bg-accent-accent hover:bg-gray-200 dark:hover:bg-gray-700',
          // text styles
          'text-gray-700 dark:text-black dark:hover:text-white',
          // focus styles
          'focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700',
          // disabled styles
          'disabled:opacity-50 dark:disabled:bg-gray-800 disabled:hover:bg-gray-100 dark:disabled:hover:bg-gray-800 disabled:dark:text-gray-400',
        ],
        error: [
          // bg styles
          'bg-red-700 hover:bg-red-800 dark:bg-accent-error dark:hover:bg-red-700',
          // text styles
          'text-white dark:text-black',
          // focus styles
          'focus:ring-4 focus:ring-red-300 dark:focus:ring-red-900',
          // disabled styles
          'disabled:bg-red-400 dark:disabled:bg-red-500 disabled:hover:bg-red-400 dark:disabled:hover:bg-red-500',
        ],
        success: [
          // bg styles
          'bg-green-700 hover:bg-green-800 dark:bg-accent-success dark:hover:bg-green-700',
          // text styles
          'text-white dark:text-black',
          // focus styles
          'focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800',
          // disabled styles
          'disabled:bg-green-400 dark:disabled:bg-green-500 disabled:hover:bg-green-400 dark:disabled:hover:bg-green-500',
        ],
      },
      pill: {
        true: 'rounded-full',
        false: 'rounded',
      },
      variant: {
        outline: '',
        flat: '',
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
        variant: 'outline',
        className: [
          // bg styles
          'bg-transparent hover:bg-gray-100 dark:bg-transparent dark:hover:bg-gray-700',
          // text styles
          'text-gray-900 hover:text-blue-700 dark:text-accent-accent dark:hover:text-white',
          // border styles
          'border border-gray-200 dark:border-accent-accent',
          // ring styles
          'focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700',
          // disabled styles
          'disabled:bg-transparent disabled:hover:bg-transparent disabled:opacity-50 disabled:hover:text-gray-900',
          'dark:disabled:bg-transparent dark:disabled:hover:bg-transparent dark:disabled:hover:text-gray-400',
        ],
      },
      {
        color: 'error',
        variant: 'outline',
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
        variant: 'outline',
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
        color: 'default',
        variant: 'flat',
        className: [
          // bg styles
          'bg-transparent hover:bg-gray-100 dark:bg-transparent dark:hover:bg-gray-700',
          // text styles
          'text-gray-900 hover:text-blue-700 dark:text-accent-accent dark:hover:text-white',
          // border styles
          'border border-gray-200 dark:border-none',
          // ring styles
          'focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700',
          // disabled styles
          'disabled:bg-transparent disabled:hover:bg-transparent disabled:opacity-50 disabled:hover:text-gray-900',
          'dark:disabled:bg-transparent dark:disabled:hover:bg-transparent dark:disabled:hover:text-gray-400',
        ],
      },
      {
        color: 'error',
        variant: 'flat',
        className: [
          // bg styles
          'dark:bg-transparent hover:bg-red-800 dark:hover:bg-red-600',
          // text styles
          'text-red-700 hover:text-white dark:text-red-500 dark:hover:text-white',
          // border styles
          'border border-red-700 dark:border-none',
          // ring styles
          'focus:ring-4 focus:ring-red-300 dark:focus:ring-red-900',
          // disabled styles
          'disabled:bg-transparent disabled:hover:bg-transparent disabled:opacity-50 disabled:hover:text-red-700',
          'dark:disabled:bg-transparent dark:disabled:hover:bg-transparent dark:disabled:hover:text-red-500',
        ],
      },
      {
        color: 'success',
        variant: 'flat',
        className: [
          // bg styles
          'dark:bg-transparent hover:bg-green-800 dark:hover:bg-green-600',
          // text styles
          'text-green-700 hover:text-white dark:text-green-500 dark:hover:text-white',
          // border styles
          'border border-green-700 dark:border-none',
          // ring styles
          'focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800',
          // disabled styles
          'disabled:bg-transparent disabled:hover:bg-transparent disabled:opacity-50 disabled:hover:text-green-700',
          'dark:disabled:bg-transparent dark:disabled:hover:bg-transparent dark:disabled:hover:text-green-500',
        ],
      },
    ],
  },
);

interface ButtonProps
  extends Omit<ComponentProps<'button'>, 'color'>,
    ObjectWithNonNullableValues<VariantProps<typeof buttonCva>> {
  size?: SizeType;
  variant?: VariantType;
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
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-4 h-4',
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
      size: ['sm', 'md', 'lg'],
      withStartIcon: true,
      className: 'mr-2',
    },
    {
      size: ['sm', 'md', 'lg'],
      withLoader: true,
      className: 'mr-2',
    },
    {
      size: ['sm', 'md', 'lg'],
      withEndIcon: true,
      className: 'ml-2',
    },
    {
      size: ['sm', 'md', 'lg'],
      withStartIcon: true,
      withEndIcon: true,
      className: 'mr-2 ml-2',
    },
  ],
});

interface IconProps extends VariantProps<typeof iconCva> {
  size?: SizeType;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  id?: string;
  loading?: boolean;
  variant?: VariantType;
  color?: ColorType;
}

const iconLoaderCva = cva('flex justify-center');
const StartIcon = ({
  id,
  startIcon,
  endIcon,
  loading,
  color,
  variant,
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
          <Loader color={color} size={size} variant={variant} />
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
      variant,
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
            variant,
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
            <Loader color={color} size={size} variant={variant} />
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
