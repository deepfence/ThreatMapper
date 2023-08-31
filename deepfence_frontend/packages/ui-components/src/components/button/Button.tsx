import { cva, VariantProps } from 'cva';
import React, { ComponentProps, useId } from 'react';
import { cn } from 'tailwind-preset';

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
  const sizeMap = new Map();
  sizeMap.set('sm', 'w-3.5 h-3.5');
  sizeMap.set('md', 'w-4 h-4');
  sizeMap.set('lg', 'w-4 h-4');

  return (
    <CircleSpinner
      size={size}
      className={cn(
        cva([sizeMap.get(size)], {
          variants: {
            color: {
              default: 'dark:dark:text-gray-900 fill-gray-200',
              error: 'fill-gray-200 dark:text-gray-900',
              success: 'fill-gray-200 dark:text-gray-900',
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
              className: 'fill-status-error dark:text-red-400',
            },
            {
              variant: 'outline',
              color: 'success',
              className: 'fill-status-success dark:text-green-400',
            },
            {
              variant: 'flat',
              color: 'default',
              className: 'dark:text-bg-active-selection fill-accent-accent',
            },
            {
              variant: 'flat',
              color: 'error',
              className: 'fill-status-error dark:text-red-400',
            },
            {
              variant: 'flat',
              color: 'success',
              className: 'fill-status-success dark:text-green-400',
            },
          ],
        })({ color, variant }),
      )}
    />
  );
};
export const buttonCva = cva(
  [
    'disabled:cursor-not-allowed uppercase',
    'flex flex-row items-center justify-center',
    'focus:outline-none select-none',
  ],
  {
    variants: {
      size: {
        sm: 'px-3 py-1 text-t3',
        md: 'px-3 py-[7px] text-t3',
        lg: 'px-3 py-2.5 text-t3',
      },
      color: {
        default: [
          // bg styles
          'bg-gray-100 dark:bg-accent-accent hover:bg-gray-200 dark:hover:bg-[#3777C2]',
          // text styles
          'text-gray-700 dark:text-black',
          // focus styles
          'focus:outline-[2px] focus:outline-gray-200 dark:focus:outline-offset-1 dark:focus:outline-offset-transparent dark:focus:outline-bg-hover-3',
          // disabled styles
          'dark:disabled:bg-df-gray-600 dark:disabled:text-df-gray-900',
        ],
        error: [
          // bg styles
          'bg-red-700 hover:bg-red-800 dark:bg-status-error dark:hover:bg-[#C45268]',
          // text styles
          'text-white dark:text-black',
          // focus styles
          'focus:outline-[2px] focus:outline-red-300 dark:focus:outline-offset-1 dark:focus:outline-offset-transparent dark:focus:outline-[#ffffffb3]',
          // disabled styles
          'dark:disabled:bg-df-gray-600 dark:disabled:text-df-gray-900',
        ],
        success: [
          // bg styles
          'bg-green-700 hover:bg-green-800 dark:bg-status-success dark:hover:bg-[#119365]',
          // text styles
          'text-white dark:text-black',
          // focus styles
          'focus:outline-[2px] focus:outline-green-300 dark:focus:outline-offset-1 dark:focus:outline-offset-transparent dark:focus:outline-[#ffffffb3]',
          // disabled styles
          'dark:disabled:bg-df-gray-600 dark:disabled:text-df-gray-900',
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
          'bg-transparent hover:bg-gray-100 dark:bg-transparent dark:hover:bg-[#0E1F33]',
          // text styles
          'text-gray-900 hover:text-blue-700 dark:text-accent-accent',
          // border styles
          'border border-gray-200 dark:border-accent-accent',
          // outline styles
          'focus:outline-[2px] focus:outline-gray-200 dark:focus:outline-offset-1 dark:focus:outline-offset-transparent dark:focus:outline-bg-hover-3',
          // disabled styles
          'dark:disabled:bg-transparent dark:disabled:border-df-gray-600',
          'dark:disabled:text-df-gray-700',
        ],
      },
      {
        color: 'error',
        variant: 'outline',
        className: [
          // bg styles
          'dark:bg-transparent hover:bg-red-800 dark:hover:bg-[#33151B]',
          // text styles
          'text-red-700 hover:text-white dark:text-status-error',
          // border styles
          'border border-red-700 dark:border-status-error',
          // outline styles
          'focus:outline-[2px] focus:outline-red-300 dark:focus:outline-offset-1 dark:focus:outline-offset-transparent dark:focus:outline-[#ffffffb3]',
          // disabled styles
          'dark:disabled:bg-transparent dark:disabled:border-df-gray-600',
          'dark:disabled:text-df-gray-700',
        ],
      },
      {
        color: 'success',
        variant: 'outline',
        className: [
          // bg styles
          'dark:bg-transparent hover:bg-green-800 dark:hover:bg-[#052E20]',
          // text styles
          'text-green-700 hover:text-white dark:text-status-success',
          // border styles
          'border border-green-700 dark:border-status-success',
          // outline styles
          'focus:outline-[2px] focus:outline-green-300 dark:focus:outline-offset-1 dark:focus:outline-offset-transparent dark:focus:outline-[#ffffffb3]',
          // disabled styles
          'dark:disabled:bg-transparent dark:disabled:border-df-gray-600',
          'dark:disabled:text-df-gray-700',
        ],
      },
      {
        color: 'default',
        variant: 'flat',
        className: [
          // bg styles
          'bg-transparent hover:bg-gray-100 dark:bg-transparent dark:hover:bg-transparent',
          // text styles
          'text-gray-900 hover:text-blue-700 dark:text-accent-accent dark:hover:text-[#3777C2]',
          // border styles
          'border border-gray-200 dark:border-none',
          // outline styles
          'focus:outline-[2px] focus:outline-gray-200 dark:focus:outline-offset-1 dark:focus:outline-offset-transparent dark:focus:outline-bg-hover-3',
          // disabled styles
          'dark:disabled:bg-transparent dark:disabled:text-df-gray-600',
        ],
      },
      {
        color: 'error',
        variant: 'flat',
        className: [
          // bg styles
          'dark:bg-transparent hover:bg-red-800 dark:hover:bg-transparent',
          // text styles
          'text-red-700 hover:text-white dark:text-status-error dark:hover:text-[#C45268]',
          // border styles
          'border border-red-700 dark:border-none',
          // outline styles
          'focus:outline-[2px] focus:outline-red-300 dark:focus:outline-offset-1 dark:focus:outline-offset-transparent dark:focus:outline-[#ffffffb3]',
          // disabled styles
          'dark:disabled:bg-transparent dark:disabled:text-df-gray-600',
        ],
      },
      {
        color: 'success',
        variant: 'flat',
        className: [
          // bg styles
          'dark:bg-transparent hover:bg-green-800 dark:hover:bg-transparent',
          // text styles
          'text-green-700 hover:text-white dark:text-status-success dark:hover:text-[#119366]',
          // border styles
          'border border-green-700 dark:border-none',
          // outline styles
          'focus:outline-[2px] focus:outline-green-300 dark:focus:outline-offset-1 dark:focus:outline-offset-transparent dark:focus:outline-[#ffffffb3]',
          // disabled styles
          'dark:disabled:bg-transparent dark:disabled:text-df-gray-600',
        ],
      },
    ],
  },
);

export interface ButtonProps
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
      true: 'mr-2',
    },
    withEndIcon: {
      true: 'ml-2',
    },
    withLoader: {
      true: 'mr-2',
    },
  },
  compoundVariants: [
    {
      size: ['sm', 'md', 'lg'],
      withStartIcon: true,
      withEndIcon: true,
      className: 'mr-2 ml-2', // fix me not have margin left for start icon
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
  if (loading) {
    return (
      <span
        className={cn(
          iconLoaderCva({}),
          iconCva({
            size,
            withStartIcon: !!startIcon,
            withEndIcon: !!endIcon,
          }),
          'ml-0',
        )}
      >
        <Loader color={color} size={size} variant={variant} />
      </span>
    );
  }
  return (
    <span
      data-testid={`button-icon-start-${id}`}
      className={cn(
        iconCva({
          size,
          withStartIcon: !!startIcon,
          withEndIcon: !!endIcon,
        }),
        'ml-0',
      )}
    >
      {startIcon}
    </span>
  );
};

const EndIcon = ({ id, size, startIcon, endIcon }: IconProps) => {
  return (
    <span
      data-testid={`button-icon-end-${id}`}
      className={cn(
        iconCva({
          size,
          withStartIcon: !!startIcon,
          withEndIcon: !!endIcon,
        }),
        'mr-0',
      )}
    >
      {endIcon}
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
        className={cn(
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
          <span
            className={cn(
              iconLoaderCva({}),
              iconCva({
                size,
                withStartIcon: false,
                withEndIcon: !!endIcon,
                withLoader: true,
              }),
              'ml-0',
            )}
          >
            <Loader color={color} size={size} variant={variant} />
          </span>
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
