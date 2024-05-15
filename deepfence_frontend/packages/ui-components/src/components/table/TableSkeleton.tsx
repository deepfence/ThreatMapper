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
}

// tailwind skeleton component
const Skeleton = ({ className, size = 'default' }: SkeletonProps) => {
  return (
    <div
      role="status"
      className={cn('w-full h-full opacity-50 px-4', {
        ['py-[15px]']: size === 'default',
        ['py-[9px]']: size === 'compact',
        ['py-[12px]']: size === 'medium',
        ['py-[18px]']: size === 'relaxed',
      })}
    >
      <div
        className={cn(
          'bg-[#939A9F]/25 dark:bg-bg-grid-border rounded-[6px] h-4',
          className,
        )}
      />
    </div>
  );
};

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columns,
  rows,
  className,
  size = 'default',
  ...props
}) => (
  <div
    className={cn(
      `overflow-x-auto overflow-y-hidden`,
      `rounded-[5px] border border-bg-grid-border`,
      className,
    )}
    data-testid={'tableSkeletonWrapperId'}
    {...props}
  >
    <table
      className="w-full bg-white dark:bg-bg-grid-default border-spacing-0 border-collapse"
      cellPadding="0"
      cellSpacing="0"
    >
      <thead className="bg-[#F5F5F5] dark:bg-bg-grid-header">
        <tr>
          {Array.from({ length: columns }).map((_, index) => (
            <th
              key={index}
              className="relative border-0 text-gray-500 dark:text-df-gray-500 border-b-[1.5px] border-bg-grid-border dark:border-bg-grid-border"
            >
              <Skeleton size={size} className={'bg-[#B0B0B0]/50'} />
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
                className={cn('border-bg-grid-border dark:border-bg-grid-border', {
                  ['border-b']: rowIdx !== rows - 1,
                })}
              >
                <Skeleton
                  size={size}
                  className={'bg-[#939A9F]/25 dark:bg-bg-grid-border'}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
