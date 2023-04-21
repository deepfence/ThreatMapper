import { Meta } from '@storybook/react';
import { useState } from 'react';

import { Pagination } from '@/components/pagination/Pagination';

export default {
  title: 'Components/Pagination',
  component: Pagination,
  argTypes: {
    onPageChange: { action: 'onPageChange' },
  },
} as Meta<typeof Pagination>;

export const NoDots = {
  args: {
    currentPage: 1,
    onPageChange: (page: number) => {
      return page + '';
    },
    totalRows: 30,
  },
};

export const LeftDots = {
  args: {
    currentPage: 5,
    onPageChange: (page: number) => {
      return page + '';
    },
    totalRows: 90,
  },
};

export const RightDots = {
  args: {
    currentPage: 2,
    onPageChange: (page: number) => {
      return page + '';
    },
    totalRows: 100,
  },
};

export const LeftRightDots = {
  args: {
    currentPage: 15,
    onPageChange: (page: number) => {
      return page + '';
    },
    totalRows: 200,
  },
};

export const TwoDigits = {
  args: {
    currentPage: 100,
    onPageChange: (page: number) => {
      return page + '';
    },
    totalRows: 200000,
    pageSize: 100,
  },
};

export const ExactPageData = () => {
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

export const SinglePageData = () => {
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
