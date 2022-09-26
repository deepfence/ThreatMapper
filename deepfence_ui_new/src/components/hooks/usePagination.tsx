import { useMemo } from 'react';

export type UsePaginationOptions = {
  currentPage: number;
  totalPageCount: number;
  siblingCount: number;
};
type Dots = 'DOTS';

const getPaginationRange = ({
  totalPageCount,
  siblingCount,
  currentPage,
}: {
  totalPageCount: number;
  siblingCount: number;
  currentPage: number;
}) => {
  const dots: Dots = 'DOTS';
  // Pages count is determined as siblingCount + firstPage + lastPage + currentPage + 2*DOTS
  const totalPageNumbers = siblingCount + 5;

  /*
      Case 1:
      If the number of pages is less than the page numbers we want to show in our
      paginationComponent, we return the range [1..totalPageCount]
    */
  if (totalPageNumbers >= totalPageCount) {
    return range(1, totalPageCount);
  }

  /*
      Calculate left and right sibling index and make sure they are within range 1 and totalPageCount
    */
  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPageCount);

  /*
      We do not show dots just when there is just one page number to be inserted between the extremes of sibling and the page limits i.e 1 and totalPageCount. Hence we are using leftSiblingIndex > 2 and rightSiblingIndex < totalPageCount - 2
    */
  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPageCount - 2;

  const firstPageIndex = 1;
  const lastPageIndex = totalPageCount;

  /*
        Case 2: No left dots to show, but rights dots to be shown
    */
  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = range(1, leftItemCount);

    /**
     * Do not show right dots when totalPageCount is 8
     */
    if (leftItemCount + 1 < totalPageCount) {
      return [...leftRange, dots, totalPageCount];
    } else {
      return [...leftRange, totalPageCount];
    }
  }

  /*
        Case 3: No right dots to show, but left dots to be shown
    */
  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = range(totalPageCount - rightItemCount + 1, totalPageCount);
    /**
     * Do not show right dots when totalPageCount is 8
     */
    if (rightItemCount + 1 < totalPageCount) {
      return [firstPageIndex, dots, ...rightRange];
    } else {
      return [firstPageIndex, ...rightRange];
    }
  }

  /*
        Case 4: Both left and right dots to be shown
    */
  if (shouldShowLeftDots && shouldShowRightDots) {
    const middleRange = range(leftSiblingIndex, rightSiblingIndex);
    return [firstPageIndex, dots, ...middleRange, dots, lastPageIndex];
  }
};

const range = (start: number, end: number) => {
  const length = end - start + 1;
  /*
        Create an array of certain length and set the elements within it from
      start value to end value.
    */
  return Array.from({ length }, (_, idx) => idx + start);
};

export const usePagination = ({
  currentPage,
  totalPageCount,
  siblingCount = 2,
}: UsePaginationOptions) => {
  return useMemo(() => {
    return getPaginationRange({
      currentPage,
      totalPageCount,
      siblingCount,
    });
  }, [totalPageCount, siblingCount, currentPage]);
};
