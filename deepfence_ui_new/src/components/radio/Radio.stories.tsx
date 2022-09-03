import { ComponentMeta, ComponentStory } from '@storybook/react';

import Radio from './Radio';

export default {
  title: 'Components/Radio',
  component: Radio,
  argTypes: {
    onValueChange: { action: 'onValueChange' },
  },
} as ComponentMeta<typeof Radio>;

const Template: ComponentStory<typeof Radio> = (args) => <Radio {...args} />;

export const Default = Template.bind({});
Default.args = {
  name: 'Fruits',
  options: [
    {
      label: 'Mango',
      value: 'mango',
    },
    {
      label: 'Apple',
      value: 'apple',
    },
    {
      label: 'Kiwi',
      value: 'kiwi',
    },
  ],
};

export const Disabled = Template.bind({});
Disabled.args = {
  name: 'Fruits',
  options: [
    {
      label: 'Disabled',
      value: 'disabled',
      disabled: true,
    },
    {
      label: 'Apple',
      value: 'apple',
    },
    {
      label: 'Kiwi',
      value: 'kiwi',
    },
  ],
};
export const DefaultSelected = Template.bind({});
DefaultSelected.args = {
  name: 'Fruits',
  defaultValue: 'apple',
  options: [
    {
      label: 'Disabled',
      value: 'disabled',
    },
    {
      label: 'Apple',
      value: 'apple',
    },
    {
      label: 'Kiwi',
      value: 'kiwi',
    },
  ],
};
