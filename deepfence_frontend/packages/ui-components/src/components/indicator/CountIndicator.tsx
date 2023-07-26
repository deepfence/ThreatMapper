import { cn } from 'tailwind-preset';

export interface CountIndicatorProps {
  count: number;
  color?: 'default' | 'primary' | 'danger' | 'success' | 'normal';
}

export const CountIndicator = ({ count, color = 'default' }: CountIndicatorProps) => {
  return (
    <span
      className={cn(
        'leading-none py-[0.3125rem] px-2.5 rounded-full text-sm font-medium',
        {
          ['bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200']:
            color === 'default',
          ['bg-blue-600 text-gray-100 dark:bg-blue-500 dark:text-white']:
            color === 'primary',
          ['bg-red-600 text-gray-100 dark:bg-red-500 dark:text-white']:
            color === 'danger',
          ['bg-green-600 text-gray-100 dark:bg-green-500 dark:text-white']:
            color === 'success',
          ['bg-gray-600 text-gray-100 dark:bg-gray-500 dark:text-white']:
            color === 'normal',
        },
      )}
    >
      {count}
    </span>
  );
};
