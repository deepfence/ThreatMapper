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
}: UsePaginationOptions): (number | 'DOTS')[] => {
  const dots: Dots = 'DOTS';

  if (currentPage > totalNumberOfPages) {
    totalNumberOfPages = currentPage;
  }

  if (totalNumberOfPages <= siblingCount * 2 + 5) {
    if (likelyToHaveMorePages) {
      return [...range(1, totalNumberOfPages + 1), dots];
    }
    return range(1, totalNumberOfPages + 1);
  }

  const middleArray = [currentPage];
  let totalSiblingsToAdd =
    totalNumberOfPages <= siblingCount * 2 ? totalNumberOfPages - 1 : siblingCount * 2;

  while (totalSiblingsToAdd > 0) {
    if (middleArray[0] >= 2) {
      middleArray.unshift(middleArray[0] - 1);
      totalSiblingsToAdd--;
    }

    if (totalSiblingsToAdd === 0) break;

    if (middleArray[middleArray.length - 1] <= totalNumberOfPages - 1) {
      middleArray.push(middleArray[middleArray.length - 1] + 1);
      totalSiblingsToAdd--;
    }
  }

  const result: (number | 'DOTS')[] = [];

  if (middleArray[0] !== 1) {
    result.push(1);
  }
  if (middleArray[0] > 2) {
    result.push(dots);
  }

  result.push(...middleArray);

  if (middleArray[middleArray.length - 1] < totalNumberOfPages - 1) {
    result.push(dots);
  }

  if (middleArray[middleArray.length - 1] !== totalNumberOfPages) {
    result.push(totalNumberOfPages);
  }

  if (likelyToHaveMorePages) {
    result.push(dots);
  }

  return result;
};

// a range function which takes a start and end as parameters and returns an array of numbers between them
// if start is greater or equal to end, it returns an empty array
// if start is less than end, it returns an array of numbers between them
// it includes start and excludes end
const range = (start: number, end: number): number[] => {
  if (start >= end) {
    return [];
  }

  return new Array(end - start).fill(0).map((_, index) => start + index);
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
