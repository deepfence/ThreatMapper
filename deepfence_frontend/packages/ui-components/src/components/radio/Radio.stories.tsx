import { Meta, StoryObj } from '@storybook/react';

import Radio from '@/components/radio/Radio';

export default {
  title: 'Components/Radio',
  component: Radio,
  argTypes: {
    onValueChange: { action: 'onValueChange' },
  },
} satisfies Meta<typeof Radio>;

export const Default: StoryObj<typeof Radio> = {
  args: {
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
  },
};

export const Disabled: StoryObj<typeof Radio> = {
  args: {
    name: 'Fruits',
    options: [
      {
        label: 'Disabled',
        value: 'disabled',
        checked: true,
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
  },
};

export const DefaultSelected: StoryObj<typeof Radio> = {
  args: {
    name: 'Fruits',
    defaultValue: 'apple',
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
  },
};

export const RowRadio: StoryObj<typeof Radio> = {
  args: {
    name: 'Fruits',
    direction: 'row',
    options: [
      {
        label: 'Mango',
        value: 'Mango',
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
  },
};
