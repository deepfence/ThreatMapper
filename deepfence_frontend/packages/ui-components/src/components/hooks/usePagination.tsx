import { useMemo } from 'react';

export type UsePaginationOptions = {
  currentPage: number;
  totalNumberOfPages: number;
  siblingCount: number;
  likelyToHaveMorePages: boolean;
};
type Dots = 'DOTS';

const getPaginationRange = ({
  totalNumberOfPages,
  siblingCount,
  currentPage,
  likelyToHaveMorePages,
}: {
  totalNumberOfPages: number;
  siblingCount: number;
  currentPage: number;
  likelyToHaveMorePages: boolean;
}) => {
  const dots: Dots = 'DOTS';
  // Pages count is determined as siblingCount + 5 (firstPage + lastPage + currentPage + 2*DOTS)
  const expectedPagesCount = siblingCount + 5;

  /*
      Case 1:
      If the number of pages is less than the page numbers we want to show in our
      paginationComponent, we return the range [1..totalNumberOfPages]
    */
  if (expectedPagesCount >= totalNumberOfPages) {
    return range(1, totalNumberOfPages);
  }

  /*
      Calculate left and right sibling index and make sure they are within range 1 and totalNumberOfPages
    */
  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalNumberOfPages);

  /*
      We do not show dots just when there is just one page number to be inserted between the extremes of sibling and the page limits i.e 1 and totalNumberOfPages. Hence we are using leftSiblingIndex > 2 and rightSiblingIndex < totalNumberOfPages - 2
    */
  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalNumberOfPages - 2;

  const firstPageIndex = 1;
  const lastPageIndex = totalNumberOfPages;

  /*
        Case 2: No left dots to show, but rights dots to be shown
    */
  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = range(1, leftItemCount);

    /**
     * Do not show right dots when totalNumberOfPages is 8
     */
    if (leftItemCount + 1 < totalNumberOfPages) {
      if (likelyToHaveMorePages) {
        return [...leftRange, dots, totalNumberOfPages, dots];
      } else {
        return [...leftRange, dots, totalNumberOfPages];
      }
    } else {
      return [...leftRange, totalNumberOfPages];
    }
  }

  /*
        Case 3: No right dots to show, but left dots to be shown
    */
  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = range(totalNumberOfPages - rightItemCount + 1, totalNumberOfPages);
    /**
     * Do not show right dots when totalNumberOfPages is 8
     */
    if (rightItemCount + 1 < totalNumberOfPages) {
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
    if (likelyToHaveMorePages) {
      return [firstPageIndex, dots, ...middleRange, dots, lastPageIndex, dots];
    }
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
  totalNumberOfPages,
  siblingCount = 2,
  likelyToHaveMorePages: likelyToHaveMorePages,
}: UsePaginationOptions) => {
  return useMemo(() => {
    return getPaginationRange({
      currentPage,
      totalNumberOfPages,
      siblingCount,
      likelyToHaveMorePages,
    });
  }, [totalNumberOfPages, siblingCount, currentPage, likelyToHaveMorePages]);
};
