import { cva, VariantProps } from 'cva';
import { ComponentProps, forwardRef, useId } from 'react';
import { cn } from 'tailwind-preset';

import { Loader } from '@/components/button/Button';
import { ObjectWithNonNullableValues } from '@/types/utils';

export type ColorType = 'default' | 'error' | 'success';
export type SizeType = 'lg' | 'md' | 'sm';
export type VariantType = 'outline' | 'flat';

export const iconButtonCVA = cva(
  [
    'flex flex-row items-center justify-center',
    'rounded focus:outline-none select-none',
    'disabled:cursor-not-allowed',
  ],
  {
    variants: {
      size: {
        sm: `p-[5px]`,
        md: `p-[7px]`,
        lg: `p-[10px]`,
      },
      color: {
        default: [
          // bg styles
          'bg-gray-100 dark:bg-accent-accent hover:bg-gray-200 dark:hover:bg-[#3777C2]',
          // text styles
          'text-gray-700 dark:text-black',
          // focus styles
          'focus:outline-[2px] focus:outline-gray-200  dark:focus:outline-offset-1 dark:focus:outline-offset-transparent dark:focus:outline-bg-hover-3',
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
          'dark:disabled:bg-df-gray-600 dark:disabled::text-df-gray-900',
        ],
        success: [
          // bg styles
          'bg-green-700 hover:bg-green-800 dark:bg-status-success dark:hover:bg-[#119365]',
          // text styles
          'text-white dark:text-black',
          // focus styles
          'focus:outline-[2px] focus:outline-green-300 dark:focus:outline-offset-1 dark:focus:outline-offset-transparent dark:focus:outline-[#ffffffb3]',
          // disabled styles
          'dark:disabled:bg-df-gray-600 dark:disabled::text-df-gray-900',
        ],
      },
      variant: {
        outline: '',
        flat: '',
      },
    },
    defaultVariants: {
      color: 'default',
      size: 'md',
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

export interface IconButtonProps
  extends Omit<ComponentProps<'button'>, 'color'>,
    ObjectWithNonNullableValues<Omit<VariantProps<typeof iconButtonCVA>, 'withOutline'>> {
  icon?: React.ReactNode;
  variant?: VariantType;
  loading?: boolean;
}

const iconCva = cva('', {
  variants: {
    size: {
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-4 h-4',
    },
  },
});

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { size = 'md', color, disabled, variant, icon, id, className, loading, ...props },
    ref,
  ) => {
    const internalId = useId();
    const _id = id ? id : internalId;

    return (
      <button
        ref={ref}
        id={_id}
        data-testid={`icon-button-${_id}`}
        disabled={disabled}
        className={cn(
          iconButtonCVA({
            size,
            color,
            variant,
          }),
          className,
        )}
        {...props}
      >
        {icon && !loading && (
          <span
            className={iconCva({
              size,
            })}
          >
            {icon}
          </span>
        )}
        {loading && (
          <div className="flex justify-center">
            <Loader color={color} size={size} variant={variant} />
          </div>
        )}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';

export default IconButton;
