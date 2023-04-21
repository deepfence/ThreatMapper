import { Meta } from '@storybook/react';

import { CountIndicator } from './CountIndicator';

export default {
  title: 'components/Indicator',
  component: CountIndicator,
} as Meta;

export const DefaultCountIndicator = {
  args: {
    count: 10,
    color: 'success',
  },
};
