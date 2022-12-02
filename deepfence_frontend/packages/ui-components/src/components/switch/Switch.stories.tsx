import { ComponentMeta, ComponentStory } from '@storybook/react';

import Switch from '@/components/switch/Switch';

export default {
  title: 'Components/Switch',
  component: Switch,
  argTypes: {
    onCheckedChange: { action: 'onCheckedChange' },
  },
} as ComponentMeta<typeof Switch>;

const Template: ComponentStory<typeof Switch> = (args) => <Switch {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: 'Toggle',
};

export const Disabled = Template.bind({});
Disabled.args = {
  label: 'Disabled',
  disabled: true,
};
export const DefaultOn = Template.bind({});
DefaultOn.args = {
  label: 'Toggle',
  defaultChecked: true,
};
