import { Meta, StoryObj } from '@storybook/react';

import Switch from '@/components/switch/Switch';

export default {
  title: 'Components/Switch',
  component: Switch,
  argTypes: {
    onCheckedChange: { action: 'onCheckedChange' },
  },
} satisfies Meta<typeof Switch>;

export const Default: StoryObj<typeof Switch> = {
  args: {
    label: 'Toggle',
  },
};

export const Disabled: StoryObj<typeof Switch> = {
  args: {
    label: 'Disabled',
    disabled: true,
  },
};

export const DefaultOn: StoryObj<typeof Switch> = {
  args: {
    label: 'Toggle',
    defaultChecked: true,
    disabled: true,
  },
};
