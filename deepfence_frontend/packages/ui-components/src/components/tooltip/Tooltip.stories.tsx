import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useState } from 'react';

import Button from '@/components/button/Button';
import { Tooltip } from '@/components/tooltip/Tooltip';

export default {
  title: 'Components/Tooltip',
  component: Tooltip,
  argTypes: {
    placement: {
      options: ['top', 'left', 'right', 'bottom'],
      control: { type: 'radio' },
    },
  },
} as ComponentMeta<typeof Tooltip>;

const Template: ComponentStory<typeof Tooltip> = (args) => (
  <Tooltip {...args}>
    <Button color="primary" style={{ margin: '5rem 18rem' }}>
      Hover me
    </Button>
  </Tooltip>
);

const ControlledTemplate: ComponentStory<typeof Tooltip> = (args) => {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip
      {...args}
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
      }}
    >
      <Button color="primary" style={{ margin: '5rem 18rem' }}>
        Hover me
      </Button>
    </Tooltip>
  );
};

export const Default = Template.bind({});
Default.args = {
  triggerAsChild: true,
  placement: 'right',
  content: 'This is a nice little tooltip.',
};

export const Controlled = ControlledTemplate.bind({});
Controlled.args = {
  triggerAsChild: true,
  placement: 'right',
  content: 'This is a nice little tooltip.',
};
