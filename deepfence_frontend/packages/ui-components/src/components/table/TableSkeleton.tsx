import classNames from 'classnames';
import { twMerge } from 'tailwind-merge';

export interface TableSkeletonProps {
  columns: number;
  rows: number;
  className?: string;
  size?: 'sm' | 'md';
}

interface SkeletonProps {
  className?: string;
  size?: 'sm' | 'md';
  location: 'header' | 'body';
}

// tailwind skeleton component
const Skeleton = ({ className, size = 'md', location }: SkeletonProps) => {
  return (
    <div
      role="status"
      className={classNames('w-full h-full animate-pulse px-4', {
        ['py-3']: size === 'sm' && location === 'header',
        ['py-2']: size === 'sm' && location === 'body',
        ['p-4']: size === 'md',
      })}
    >
      <div
        className={twMerge(
          classNames(
            'bg-gray-200 dark:bg-gray-700 rounded-md h5',
            {
              ['h-5']: size === 'md',
              ['h-4']: size === 'sm',
              ['bg-gray-300 dark:bg-gray-600']: location === 'header',
            },
            className,
          ),
        )}
      />
    </div>
  );
};

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columns,
  rows,
  className,
  size = 'md',
}) => (
  <div
    className={twMerge(
      classNames(
        `overflow-x-auto overflow-y-hidden`,
        `shadow-[0px_1px_3px_rgba(0,_0,_0,_0.1),_0px_1px_2px_-1px_rgba(0,_0,_0,_0.1)] dark:shadow-sm`,
        `rounded-lg dark:border dark:border-gray-700`,
        className,
      ),
    )}
  >
    <table
      className="w-full bg-white dark:bg-gray-800 border-spacing-0 border-collapse"
      cellPadding="0"
      cellSpacing="0"
    >
      <thead className="bg-gray-50 dark:bg-gray-700">
        <tr>
          {Array.from({ length: columns }).map((_, index) => (
            <th
              key={index}
              className="relative border-0 text-gray-500 dark:text-white border-b border-gray-200 dark:border-gray-700"
            >
              <Skeleton size={size} location="header" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <tr key={rowIdx}>
            {Array.from({ length: columns }).map((_, index) => (
              <td
                key={index}
                className={classNames('border-gray-200 dark:border-gray-700', {
                  ['border-b']: rowIdx !== rows - 1,
                })}
              >
                <Skeleton size={size} location="body" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
