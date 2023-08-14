import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Pagination } from '@/components/pagination/Pagination';

export default {
  title: 'Components/Pagination',
  component: Pagination,
  argTypes: {
    onPageChange: { action: 'onPageChange' },
  },
} satisfies Meta<typeof Pagination>;

export const NoDots: StoryObj<typeof Pagination> = {
  args: {
    currentPage: 1,
    onPageChange: (page: number) => {
      return page + '';
    },
    totalRows: 30,
  },
};

export const LeftDots: StoryObj<typeof Pagination> = {
  args: {
    currentPage: 5,
    onPageChange: (page: number) => {
      return page + '';
    },
    totalRows: 90,
  },
};

export const RightDots: StoryObj<typeof Pagination> = {
  args: {
    currentPage: 2,
    onPageChange: (page: number) => {
      return page + '';
    },
    totalRows: 100,
  },
};

export const ApproximatePagination: StoryObj<typeof Pagination> = {
  args: {
    currentPage: 15,
    onPageChange: (page: number) => {
      return page + '';
    },
    totalRows: 200,
    approximatePagination: true,
  },
};

export const LeftRightDots: StoryObj<typeof Pagination> = {
  args: {
    currentPage: 15,
    onPageChange: (page: number) => {
      return page + '';
    },
    totalRows: 200,
  },
};

export const TwoDigits: StoryObj<typeof Pagination> = {
  args: {
    currentPage: 100,
    onPageChange: (page: number) => {
      return page + '';
    },
    totalRows: 200000,
    pageSize: 100,
  },
};

export const ExactPageData: StoryFn<typeof Pagination> = () => {
  const [currentPage, setCurrentPage] = useState(1);
  return (
    <Pagination
      currentPage={currentPage}
      onPageChange={(page) => setCurrentPage(page)}
      siblingCount={2}
      pageSize={10}
      totalRows={100}
    />
  );
};

export const SinglePageData: StoryFn<typeof Pagination> = () => {
  const [currentPage, setCurrentPage] = useState(1);
  return (
    <Pagination
      currentPage={currentPage}
      onPageChange={(page) => setCurrentPage(page)}
      siblingCount={2}
      pageSize={10}
      totalRows={100}
    />
  );
};
