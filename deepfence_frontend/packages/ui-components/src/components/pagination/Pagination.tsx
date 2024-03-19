import { useMemo } from 'react';
import { cn } from 'tailwind-preset';

import { usePagination, UsePaginationOptions } from '@/components/hooks/usePagination';
import { EllipsisHorizontalLineIcon } from '@/components/icons/EllipsisHorizontalLine';

const DotsHorizontal = () => {
  return (
    <span className="h-3 w-3">
      <EllipsisHorizontalLineIcon />
    </span>
  );
};
interface PageButtonProps {
  label: string | number | JSX.Element;
  className: string;
  disabled: boolean;
  onPageChange?: () => void;
}

interface OwnProps {
  onPageChange: (page: number) => void;
  approximatePagination?: boolean;
  totalRows: number;
  pageSize?: number;
}
type Props = Partial<Pick<UsePaginationOptions, 'currentPage' | 'siblingCount'>> &
  OwnProps;

const PageButton = ({
  label,
  onPageChange,
  disabled,
  className,
  ...rest
}: PageButtonProps) => {
  return (
    <button
      className={cn(
        // we donot want border to be overlap so we use border right here
        'flex justify-center items-center text-p7a bg-bg-card',
        'px-3 py-[5px] border-r border-y border-bg-grid-border',
        'text-text-icon overflow-hidden',
        'hover:text-text-input-value',
        className,
      )}
      onClick={() => {
        onPageChange?.();
      }}
      type="button"
      disabled={disabled}
      {...rest}
    >
      {label}
    </button>
  );
};

export const Pagination = ({
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  totalRows,
  siblingCount = 2,
  approximatePagination = false,
}: Props) => {
  let totalNumberOfPages = Math.ceil(totalRows / pageSize);
  let likelyToHaveMorePages = false;

  // if approximate pagination we only check for 10 pages
  if (approximatePagination && totalNumberOfPages - currentPage + 1 >= 10) {
    totalNumberOfPages = totalNumberOfPages - 1;
    likelyToHaveMorePages = true;
  }

  const pagination = usePagination({
    currentPage,
    totalNumberOfPages,
    siblingCount,
    likelyToHaveMorePages,
  });

  const currentShowing = useMemo(() => {
    /**
     * For page 1, start count will always be 1
     * end count can either be total available rows or calculated value
     * 
     * At page between first and last, start count will be cuurentPage * pageSize - pageSize + 1 because
     * eg: currentPage is 2, total page is 3, pageSize is 5
     * For first page start count is 1 and end count is 5. [1-5]
     * For second page start count must be 6 (2 * 5 - 5 + 1 = 10 - 5 + 1 = 6) [6-10]

     * At last page total rows can be lesser than total available rows, so end count is max set to total rows
     * At last page start count cannot go beyond total rows, so set to last page - 1 * pageSize
     * 
     * At page 1 total rows could be less than total available rows
     */
    let startCount = 1;
    let endCount = 1;

    startCount = currentPage * pageSize - pageSize + 1;
    endCount = currentPage * pageSize;

    if (endCount >= totalRows) {
      startCount = (currentPage - 1) * pageSize + 1;
      endCount = totalRows;
    }

    if (currentPage == 1) {
      startCount = 1;
      endCount = pageSize > totalRows ? totalRows : pageSize;
    }
    return [startCount, endCount];
  }, [currentPage, totalRows, pageSize]);

  const onPrevious = () => {
    if (currentPage === 1) {
      return;
    }
    onPageChange(currentPage - 1);
  };

  const onNext = () => {
    if (currentPage === totalNumberOfPages) {
      return;
    }
    onPageChange(currentPage + 1);
  };

  return (
    <div className="flex justify-end items-center gap-4">
      <div className={`text-text-text-and-icon text-p4`}>
        Showing{' '}
        <span className="text-text-input-value text-p3" data-testid="showingId">
          {currentShowing[0]}-{currentShowing[1]}
        </span>
        {!approximatePagination ? (
          <>
            <span> of</span>
            <span className="text-text-input-value text-p3" data-testid="ofTotalRowsId">
              {' '}
              {totalRows}
            </span>
          </>
        ) : null}
      </div>
      <div className={cn(`flex flex-row flex-nowrap`)} data-testid="pageButtonId">
        <PageButton
          data-testid="pagination-prev"
          label={
            <div className="h-4 w-4 rotate-180 text-text-icon">
              <CaretIcon />
            </div>
          }
          key={'Previous'}
          onPageChange={onPrevious}
          disabled={totalNumberOfPages === 0}
          className={cn('rounded-l border-l px-1.5')}
        />

        {pagination?.map((page, index) => {
          if (page === 'DOTS') {
            return (
              <PageButton
                label={<DotsHorizontal />}
                key={page + index}
                disabled={true}
                className={'px-2 py-1.5 foucs:border-gray-700'}
                data-testid="pagination-button-dots"
              />
            );
          }
          return (
            <PageButton
              label={page}
              key={page}
              onPageChange={() => {
                onPageChange(page);
              }}
              disabled={false}
              className={cn('text-text-icon', {
                'dark:bg-bg-active-selection bg-text-link dark:text-text-input-value text-text-text-inverse hover:text-text-text-inverse':
                  page === currentPage,
              })}
            />
          );
        })}

        <PageButton
          label={
            <div className="h-4 w-4 text-text-icon">
              <CaretIcon />
            </div>
          }
          key={'Next'}
          data-testid="pagination-next"
          onPageChange={onNext}
          disabled={totalNumberOfPages === 0}
          className={cn('rounded-r px-1.5')}
        />
      </div>
    </div>
  );
};

const CaretIcon = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.90047 13.6175L11.4392 8.26468L5.90047 2.9118C5.58611 2.60898 5.08578 2.61835 4.78297 2.93271C4.48015 3.24708 4.48951 3.7474 4.80387 4.05022L9.16703 8.26468L4.80387 12.4838C4.48951 12.7866 4.48015 13.2869 4.78297 13.6013C5.08578 13.9157 5.58611 13.925 5.90047 13.6222V13.6175Z"
        fill="currentColor"
      />
    </svg>
  );
};

Pagination.displayName = 'Pagination';
export default Pagination;
