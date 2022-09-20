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
  totalPageCount: 5,
};

export const LeftDots = Template.bind({});
LeftDots.args = {
  currentPage: 5,
  onPageChange: (page) => {
    return page + '';
  },
  totalPageCount: 9,
};

export const RightDots = Template.bind({});
RightDots.args = {
  currentPage: 2,
  onPageChange: (page) => {
    return page + '';
  },
  totalPageCount: 9,
};

export const LeftRightDots = Template.bind({});
LeftRightDots.args = {
  currentPage: 15,
  onPageChange: (page) => {
    return page + '';
  },
  totalPageCount: 20,
};

export const TwoDigits = Template.bind({});
TwoDigits.args = {
  currentPage: 150,
  onPageChange: (page) => {
    return page + '';
  },
  totalPageCount: 200,
};

export const OnPageChange = () => {
  const [currentPage, setCurrentPage] = useState(150);
  return (
    <Pagination
      currentPage={currentPage}
      totalPageCount={200}
      onPageChange={(page) => setCurrentPage(page)}
      siblingCount={2}
    />
  );
};
