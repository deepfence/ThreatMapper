import { Meta, StoryObj } from '@storybook/react';

import { CircleSpinner } from '@/components/spinner/CircleSpinner';

export default {
  title: 'Components/CircleSpinner',
  component: CircleSpinner,
} satisfies Meta<typeof CircleSpinner>;

export const SM: StoryObj<typeof CircleSpinner> = {
  args: {
    size: 'sm',
  },
};

export const MD: StoryObj<typeof CircleSpinner> = {
  args: {
    size: 'md',
  },
};

export const LG: StoryObj<typeof CircleSpinner> = {
  args: {
    size: 'lg',
  },
};
