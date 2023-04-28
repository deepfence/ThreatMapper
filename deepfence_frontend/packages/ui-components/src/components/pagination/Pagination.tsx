import cx from 'classnames';
import { memo, useMemo } from 'react';
import { HiDotsHorizontal } from 'react-icons/hi';
import { twMerge } from 'tailwind-merge';

import { usePagination, UsePaginationOptions } from '@/components/hooks/usePagination';
import { Typography } from '@/components/typography/Typography';

export type SizeType = 'sm' | 'md';

type PageButtonProps = {
  label: string | number | JSX.Element;
  className: string;
  disabled: boolean;
  onPageChange?: () => void;
};

type OwnProps = {
  onPageChange: (page: number) => void;
  approximatePagination?: boolean;
  totalRows: number;
  pageSize?: number;
  sizing?: SizeType;
};
type Props = Partial<Pick<UsePaginationOptions, 'currentPage' | 'siblingCount'>> &
  OwnProps;

const PageButton = memo(
  ({ label, onPageChange, disabled, className, ...rest }: PageButtonProps) => {
    return (
      <button
        className={twMerge(
          // we donot want border to be overlap so we use border right here
          cx(
            'flex justify-center items-center outline-none',
            'px-3 py-1.5 border-r border-y border-gray-300 dark:border-gray-700',
            'hover:bg-gray-100 hover:text-gray-700',
            'dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-white',
            'focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-600 dark:focus:ring-blue-800',
          ),
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
  },
);

export const Pagination = ({
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  totalRows,
  siblingCount = 2,
  sizing = 'sm',
  approximatePagination = false,
}: Props) => {
  const totalNumberOfPages = Math.ceil(totalRows / pageSize);

  /* For an approximatePagination, we could not confirm exact page numbers, and 
     for number of pages at given current page, there is chances to have more number of pages, is such situation
     dots are shown to ui to indicate more pages are available.
  */
  const likelyToHaveMorePages = approximatePagination
    ? totalRows >= totalNumberOfPages * pageSize
    : false;

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
  }, [currentPage, totalRows]);

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

  if (totalNumberOfPages === 0) {
    return null;
  }

  return (
    <div className="flex justify-between items-center">
      <div
        className={`${Typography.weight.normal} ${
          Typography.size[sizing as keyof typeof Typography.size]
        } text-gray-500 dark:text-gray-400`}
      >
        Showing{' '}
        <span className="text-black dark:text-white">
          {currentShowing[0]}-{currentShowing[1]}
        </span>
        {!approximatePagination ? (
          <>
            <span> of</span>
            <span className="text-black dark:text-white"> {totalRows}</span>
          </>
        ) : null}
      </div>
      <div
        className={cx(
          `flex flex-row flex-nowrap ${Typography.weight.medium} ${
            Typography.size[sizing as keyof typeof Typography.size]
          }`,
          'bg-white text-gray-500',
          'dark:bg-gray-800 dark:text-gray-400',
        )}
      >
        <PageButton
          label={'Previous'}
          key={'Previous'}
          onPageChange={onPrevious}
          disabled={false}
          className={cx('rounded-l border-l')}
        />

        {pagination?.map((page, index) => {
          if (page === 'DOTS') {
            return (
              <PageButton
                label={<HiDotsHorizontal />}
                key={page + index}
                disabled={true}
                className={'px-2 py-1.5 focus:border-gray-300 focus:dark:border-gray-700'}
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
              className={cx({
                'bg-blue-100 text-blue-600 dark:bg-gray-700 dark:text-white':
                  page === currentPage,
                'hover:bg-blue-100 hover:text-blue-600 hover:dark:bg-gray-700 dark:text-white':
                  page === currentPage,
              })}
            />
          );
        })}

        <PageButton
          label={'Next'}
          key={'Next'}
          onPageChange={onNext}
          disabled={false}
          className={cx('rounded-r')}
        />
      </div>
    </div>
  );
};

Pagination.displayName = 'Pagination';
export default Pagination;
