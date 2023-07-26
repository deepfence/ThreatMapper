import { Meta } from '@storybook/react';

import { Card } from '@/components/card/Card';

export default {
  title: 'Components/Card',
  component: Card,
} as Meta<typeof Card>;

const Content = () => (
  <div className="w-[300px] p-4">
    <h5 className="text-lg dark:text-white">Northworthy technology acquisitions 2021</h5>
    <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">
      Here are the biggest enterprise technology acquisitions of 2021 so far, in reverse
      chronological order.
    </p>
  </div>
);

export const Default = {
  args: {
    children: <Content />,
  },
};
