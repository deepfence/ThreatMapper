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
          'hover:bg-bg-hover-1 bg-accent-accent',
          // text styles
          'text-text-text-inverse',
          // focus styles
          'focus:outline-[2px] focus:outline-offset-1 focus:outline-offset-transparent focus:outline-bg-hover-3',
          // disabled styles
          'dark:disabled:bg-df-gray-600 dark:disabled:text-df-gray-900 disabled:bg-df-gray-400 disabled:text-df-gray-600',
        ],
        error: [
          // bg styles
          'bg-status-error dark:hover:bg-[#C45268] hover:bg-[#9B1C1C]',
          // text styles
          'text-text-text-inverse',
          // focus styles
          'focus:outline-[2px] focus:outline-offset-1 focus:outline-offset-transparent dark:focus:outline-[#ffffffb3] focus:outline-[#ea2300]',
          // disabled styles
          'dark:disabled:bg-df-gray-600 dark:disabled:text-df-gray-900 disabled:bg-df-gray-400 disabled:text-df-gray-600',
        ],
        success: [
          // bg styles
          'bg-status-success dark:hover:bg-[#119365] hover:bg-[#306b00]',
          // text styles
          'text-text-text-inverse',
          // focus styles
          'focus:outline-[2px] focus:outline-offset-1 focus:outline-offset-transparent dark:focus:outline-[#ffffffb3] focus:outline-[#449800]',
          // disabled styles
          'dark:disabled:bg-df-gray-600 dark:disabled:text-df-gray-900 disabled:bg-df-gray-400 disabled:text-df-gray-600',
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
          'bg-transparent dark:hover:bg-bg-hover-2 hover:bg-[#e3f5fc]',
          // text styles
          'text-accent-accent dark:hover:text-accent-accent hover:text-[#00567a]',
          // border styles
          'border border-accent-accent dark:hover:border-accent-accent hover:border-[#0079ad]',
          // outline styles
          'focus:outline-[2px] focus:outline-offset-1 focus:outline-offset-transparent focus:outline-bg-hover-3',
          // disabled styles
          'disabled:bg-transparent dark:disabled:border-df-gray-600',
          'dark:disabled:text-df-gray-700 disabled:border-df-gray-400 disabled:text-df-gray-400',
          'dark:disabled:bg-transparent',
        ],
      },
      {
        color: 'error',
        variant: 'outline',
        className: [
          // bg styles
          'bg-transparent hover:bg-[#fff2f0] dark:hover:bg-[#33151B]',
          // text styles
          'text-status-error',
          // border styles
          'border border-status-error',
          // outline styles
          'focus:outline-[2px] focus:outline-offset-1 focus:outline-offset-transparent dark:focus:outline-[#ffffffb3] focus:outline-[#f82500]',
          // disabled styles
          'disabled:bg-transparent dark:disabled:border-df-gray-600',
          'dark:disabled:text-df-gray-700 disabled:border-df-gray-400 disabled:text-df-gray-400',
          'dark:disabled:bg-transparent',
        ],
      },
      {
        color: 'success',
        variant: 'outline',
        className: [
          // bg styles
          'bg-transparent hover:bg-[#eefce3] dark:hover:bg-[#052E20]',
          // text styles
          'text-status-success',
          // border styles
          'border border-status-success dark:hover:border-status-success hover:border-[#42810e]',
          // outline styles
          'focus:outline-[2px] focus:outline-offset-1 focus:outline-offset-transparent dark:focus:outline-[#ffffffb3] focus:outline-[#449800]',
          // disabled styles
          'disabled:bg-transparent dark:disabled:border-df-gray-600',
          'dark:disabled:text-df-gray-700 disabled:border-df-gray-400 disabled:text-df-gray-400',
          'dark:disabled:bg-transparent',
        ],
      },
      {
        color: 'default',
        variant: 'flat',
        className: [
          // bg styles
          'bg-transparent dark:hover:bg-transparent hover:bg-transparent',
          // text styles
          'text-accent-accent dark:hover:text-[#3777C2] hover:text-[#00618a]',
          // border styles
          'border-none',
          // outline styles
          'focus:outline-[2px] focus:outline-offset-1 focus:outline-offset-transparent focus:outline-bg-hover-3',
          // disabled styles
          'dark:disabled:bg-transparent disabled:bg-transparent dark:disabled:text-df-gray-600 disabled:text-df-gray-400',
        ],
      },
      {
        color: 'error',
        variant: 'flat',
        className: [
          // bg styles
          'bg-transparent dark:hover:bg-transparent hover:bg-transparent',
          // text styles
          'text-status-error dark:hover:text-[#C45268] hover:text-[#9B1C1C]',
          // border styles
          'border-none',
          // outline styles
          'focus:outline-[2px focus:outline-offset-1 focus:outline-offset-transparent dark:focus:outline-[#ffffffb3] focus:outline-[#f82500]',
          // disabled styles
          'dark:disabled:bg-transparent disabled:bg-transparent dark:disabled:text-df-gray-600 disabled:text-df-gray-400',
        ],
      },
      {
        color: 'success',
        variant: 'flat',
        className: [
          // bg styles
          'bg-transparent hover:bg-transparent dark:hover:bg-transparent',
          // text styles
          'text-status-success dark:hover:text-[#119366] hover:text-[#366a0c]',
          // border styles
          'border-none',
          // outline styles
          'focus:outline-[2px focus:outline-offset-1 dark:focus:outline-offset-transparent dark:focus:outline-[#ffffffb3] focus:outline-[#449800]',
          // disabled styles
          'dark:disabled:bg-transparent disabled:bg-transparent dark:disabled:text-df-gray-600 disabled:text-df-gray-400',
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
