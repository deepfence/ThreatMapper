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
}): (number | 'DOTS')[] => {
  const dots: Dots = 'DOTS';

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

  const restult: (number | 'DOTS')[] = [];

  if (middleArray[0] !== 1) {
    restult.push(1);
  }
  if (middleArray[0] > 2) {
    restult.push(dots);
  }

  restult.push(...middleArray);

  if (middleArray[middleArray.length - 1] < totalNumberOfPages - 1) {
    restult.push(dots);
  }

  if (middleArray[middleArray.length - 1] !== totalNumberOfPages) {
    restult.push(totalNumberOfPages);
  }

  if (likelyToHaveMorePages) {
    restult.push(dots);
  }

  return restult;
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
