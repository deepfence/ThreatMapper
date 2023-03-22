import { Meta, Story } from '@storybook/react';

import { CountIndicator, CountIndicatorProps } from './CountIndicator';

export default {
  title: 'components/Indicator',
  component: CountIndicator,
} as Meta;

const CountIndicatorTemplate: Story<CountIndicatorProps> = (args) => (
  <CountIndicator {...args} />
);
export const DefaultCountIndicator = CountIndicatorTemplate.bind({});
DefaultCountIndicator.args = {
  count: 10,
  color: 'success',
};
