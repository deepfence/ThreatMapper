import { cva } from 'cva';
import { cn } from 'tailwind-preset';

export const comboboxInputCva = cva(
  [
    'df-input flex justify-start items-center w-full disabled:cursor-not-allowed',
    'focus:outline-none',
    'pt-1.5 pb-[5px]',
    'border-b',
    'transition-[background-size] duration-[0.2s] ease-[ease]',
  ],
  {
    variants: {
      color: {
        default: [
          cn(
            // border
            'border-text-text-and-icon',
            // bg styles
            'bg-df-gray-50',
            // text font
            'text-p4',
            // text styles
            'text-text-input-value',
            // disabled text color
            'disabled:text-df-gray-700 dark:disabled:text-df-gray-600',
            // bg styles
            'bg-[length:0%_100%] focus:bg-[length:100%_100%]',
            'focus:border-b-accent-accent',
            'bg-[length:0%_100%] bg-no-repeat',
            'bg-gradient-to-b from-transparent from-95% to-[#489cff] to-95%',
          ),
        ],
        error: [
          cn(
            // border
            'border-chart-red',
            // bg styles
            'bg-df-gray-50',
            // text font
            'text-p4',
            // text styles
            'text-text-input-value',
            // disabled text color
            'disabled:text-df-gray-700 dark:disabled:text-df-gray-600',
            // bg styles
            'bg-[length:0%_100%] focus:bg-[length:100%_100%]',
            'focus:border-b-status-error',
            'bg-[length:0%_100%] bg-no-repeat',
            'bg-gradient-to-b from-transparent from-95% to-[#f55b47] to-95%',
          ),
        ],
      },
      sizing: {
        md: '',
      },
      isPlaceholder: {
        true: '',
        false: '',
      },
      isOpen: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      color: 'default',
      sizing: 'md',
      isPlaceholder: false,
      isOpen: false,
    },
    compoundVariants: [
      {
        isPlaceholder: true,
        className: 'dark:text-df-gray-400 dark:disabled:text-df-gray-500',
      },
      {
        isOpen: true,
        color: 'default',
        className:
          'dark:bg-[length:100%_100%] dark:border-b-accent-accent dark:bg-no-repeat',
      },
      {
        isOpen: true,
        color: 'error',
        className: 'dark:bg-[length:100%_100%] dark:border-b-chart-red dark:bg-no-repeat',
      },
    ],
  },
);
