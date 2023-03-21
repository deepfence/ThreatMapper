import { cva, VariantProps } from 'cva';
import { ComponentProps, forwardRef, useId } from 'react';
import { IconContext } from 'react-icons';
import { twMerge } from 'tailwind-merge';

import { Loader } from '@/components/button/Button';
import { ObjectWithNonNullableValues } from '@/types/utils';

export type ColorType = 'default' | 'primary' | 'danger' | 'success' | 'normal';
export type SizeType = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const iconButtonCVA = cva(
  [
    'flex flex-row items-center justify-center',
    'rounded-full focus:outline-none select-none',
    'disabled:cursor-not-allowed',
  ],
  {
    variants: {
      size: {
        xxs: `p-[6px]`,
        xs: `p-[9px]`,
        sm: `p-[13px]`,
        md: `p-[15px]`,
        lg: `p-[18px]`,
        xl: `p-[20px]`,
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
          'bg-transparent hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700',
          // text styles
          'text-gray-900 hover:text-blue-700 dark:text-gray-400 dark:hover:text-white',
          // border styles
          'border border-gray-200 dark:border-gray-600',
          // ring styles
          'focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700',
          // disabled styles
          'disabled:opacity-50 dark:disabled:bg-gray-800 disabled:hover:bg-gray-100 dark:disabled:hover:bg-gray-800 disabled:dark:text-gray-400',
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
          'disabled:bg-blue-400 dark:disabled:bg-blue-500 disabled:hover:bg-blue-400 dark:disabled:hover:bg-blue-500',
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
          'disabled:bg-red-400 dark:disabled:bg-red-500 disabled:hover:bg-red-400 dark:disabled:hover:bg-red-500',
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
          'disabled:bg-green-400 dark:disabled:bg-green-500 disabled:hover:bg-green-400 dark:disabled:hover:bg-green-500',
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

interface IconButtonProps
  extends Omit<ComponentProps<'button'>, 'color'>,
    ObjectWithNonNullableValues<Omit<VariantProps<typeof iconButtonCVA>, 'withOutline'>> {
  icon?: React.ReactNode;
  outline?: boolean;
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
  },
});

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { size = 'md', color, disabled, outline, icon, id, className, loading, ...props },
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
        className={twMerge(
          iconButtonCVA({
            size,
            color,
            withOutline: outline,
          }),
          className,
        )}
        {...props}
      >
        {icon && !loading && (
          <IconContext.Provider
            value={{
              className: iconCva({
                size,
              }),
            }}
          >
            {icon}
          </IconContext.Provider>
        )}
        {loading && (
          <div className="flex justify-center">
            <Loader color={color} size={size} outline={outline} />
          </div>
        )}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';

export default IconButton;
