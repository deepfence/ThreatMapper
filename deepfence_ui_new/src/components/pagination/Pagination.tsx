import cx from 'classnames';
import { memo } from 'react';
import { HiDotsHorizontal } from 'react-icons/hi';
import { twMerge } from 'tailwind-merge';

import { PaginationProps, usePagination } from '../hooks/usePagination';
import { Typography } from '../typography/Typography';

type PageButtonProps = {
  label: string | number | JSX.Element;
  className: string;
  disabled: boolean;
  onPageChange?: () => void;
};

type OnPageChangeProps = {
  onPageChange: (page: number) => void;
};
type Props = Pick<PaginationProps, 'currentPage' | 'totalPageCount' | 'siblingCount'> &
  OnPageChangeProps;

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
            'focus:ring-1 focus:ring-inset foucs:ring-blue-600',
            'dark:focus:border-blue-800',
          ),
          className,
        )}
        onClick={() => {
          onPageChange?.();
        }}
        disabled={disabled}
        {...rest}
      >
        {label}
      </button>
    );
  },
);

export const Pagination = ({
  currentPage,
  onPageChange,
  totalPageCount,
  siblingCount = 2,
}: Props) => {
  const pagination = usePagination({
    currentPage,
    totalPageCount,
    siblingCount,
  });
  const onPrevious = () => {
    if (currentPage === 1) {
      return;
    }
    onPageChange(currentPage - 1);
  };

  const onNext = () => {
    if (currentPage === totalPageCount) {
      return;
    }
    onPageChange(currentPage + 1);
  };

  return (
    <div className="w-fit">
      <div
        className={cx(
          `flex flex-row flex-nowrap ${Typography.weight.medium} ${Typography.size.sm}`,
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
