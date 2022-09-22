import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useState } from 'react';

import { Pagination } from './Pagination';

export default {
  title: 'Components/Pagination',
  component: Pagination,
  argTypes: {
    onPageChange: { action: 'onPageChange' },
  },
} as ComponentMeta<typeof Pagination>;

const Template: ComponentStory<typeof Pagination> = (args) => <Pagination {...args} />;

export const NoDots = Template.bind({});
NoDots.args = {
  currentPage: 1,
  onPageChange: (page) => {
    return page + '';
  },
  totalRows: 30,
};

export const LeftDots = Template.bind({});
LeftDots.args = {
  currentPage: 5,
  onPageChange: (page) => {
    return page + '';
  },
  totalRows: 90,
};

export const RightDots = Template.bind({});
RightDots.args = {
  currentPage: 2,
  onPageChange: (page) => {
    return page + '';
  },
  totalRows: 100,
};

export const LeftRightDots = Template.bind({});
LeftRightDots.args = {
  currentPage: 15,
  onPageChange: (page) => {
    return page + '';
  },
  totalRows: 200,
};

export const TwoDigits = Template.bind({});
TwoDigits.args = {
  currentPage: 100,
  onPageChange: (page) => {
    return page + '';
  },
  totalRows: 200000,
  pageSize: 100,
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
