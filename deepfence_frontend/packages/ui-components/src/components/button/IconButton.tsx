import { cva, VariantProps } from 'cva';
import { ComponentProps, forwardRef, useId } from 'react';
import { IconContext } from 'react-icons';
import { twMerge } from 'tailwind-merge';

import { ObjectWithNonNullableValues } from '@/types/utils';

export type ColorType = 'default' | 'primary' | 'danger' | 'success' | 'normal';
export type SizeType = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const iconButtonCVA = cva(
  [
    'flex flex-row items-center justify-center',
    'rounded-full focus:outline-none select-none',
    'disabled:cursor-not-allowed',
  ],
  {
    variants: {
      size: {
        xs: `p-[9px]`,
        sm: `p-[13px]`,
        md: `p-[15px]`,
        lg: `p-[18px]`,
        xl: `p-[20px]`,
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
          'bg-blue-700  hover:bg-blue-800',
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
          'bg-green-700  hover:bg-green-800',
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

interface IconButtonProps
  extends Omit<ComponentProps<'button'>, 'className' | 'color'>,
    ObjectWithNonNullableValues<Omit<VariantProps<typeof iconButtonCVA>, 'withOutline'>> {
  icon?: React.ReactNode;
  outline?: boolean;
}

const iconCva = cva('', {
  variants: {
    size: {
      xs: 'w-2.5 h-2.5',
      sm: 'w-2.5 h-2.5',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-3 h-3',
    },
  },
});

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'md', color, disabled, outline, icon, id, ...props }, ref) => {
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
        )}
        {...props}
      >
        {icon && (
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
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';

export default IconButton;
