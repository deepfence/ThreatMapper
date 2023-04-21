import { Meta } from '@storybook/react';

import { CircleSpinner } from '@/components/spinner/CircleSpinner';

export default {
  title: 'Components/CircleSpinner',
  component: CircleSpinner,
} as Meta<typeof CircleSpinner>;

export const XS = {
  args: {
    size: 'xs',
  },
};

export const SM = {
  args: {
    size: 'sm',
  },
};

export const MD = {
  args: {
    size: 'md',
  },
};

export const LG = {
  args: {
    size: 'lg',
  },
};

export const XL = {
  args: {
    size: 'xl',
  },
};

export const Default = {
  args: {},
};
