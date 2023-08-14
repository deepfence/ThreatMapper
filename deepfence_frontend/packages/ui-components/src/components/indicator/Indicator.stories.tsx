import { Meta, StoryObj } from '@storybook/react';

import { CountIndicator } from './CountIndicator';

export default {
  title: 'components/Indicator',
  component: CountIndicator,
} satisfies Meta<typeof CountIndicator>;

export const DefaultCountIndicator: StoryObj<typeof CountIndicator> = {
  args: {
    count: 10,
    color: 'success',
  },
};
