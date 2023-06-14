import { cn } from 'tailwind-preset';

type SizeOf = 'compact' | 'medium' | 'default' | 'relaxed';

export interface TableSkeletonProps {
  columns: number;
  rows: number;
  className?: string;
  size?: SizeOf;
}

interface SkeletonProps {
  className?: string;
  size?: SizeOf;
  location: 'header' | 'body';
}

// tailwind skeleton component
const Skeleton = ({ className, size = 'default', location }: SkeletonProps) => {
  return (
    <div
      role="status"
      className={cn('w-full h-full opacity-50 px-4', {
        ['py-4']: size === 'default' && location === 'header',
        ['py-2.5']: size === 'compact' && location === 'header',
        ['py-[13px]']: size === 'medium' && location === 'header',
        ['py-[19px]']: size === 'relaxed' && location === 'header',
        ['py-[15px]']: size === 'default' && location === 'body',
        ['py-[9px]']: size === 'compact' && location === 'body',
        ['py-[12px]']: size === 'medium' && location === 'body',
        ['py-[18px]']: size === 'relaxed' && location === 'body',
      })}
    >
      <div
        className={cn('bg-gray-200 dark:bg-bg-grid-border rounded-[6px] h-4', className)}
      />
    </div>
  );
};

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columns,
  rows,
  className,
  size = 'default',
}) => (
  <div
    className={cn(
      `overflow-x-auto overflow-y-hidden`,
      `rounded-[5px] dark:border dark:border-bg-grid-border`,
      className,
    )}
  >
    <table
      className="w-full bg-white dark:bg-bg-grid-default border-spacing-0 border-collapse"
      cellPadding="0"
      cellSpacing="0"
    >
      <thead className="bg-gray-50 dark:bg-bg-grid-header">
        <tr>
          {Array.from({ length: columns }).map((_, index) => (
            <th
              key={index}
              className="relative border-0 text-gray-500 dark:text-df-gray-500 border-b-[1.5px] border-gray-200 dark:border-bg-grid-border"
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
                className={cn('border-gray-200 dark:border-bg-grid-border', {
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
