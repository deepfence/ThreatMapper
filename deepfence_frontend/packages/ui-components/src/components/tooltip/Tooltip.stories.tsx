import { Meta, StoryFn } from '@storybook/react';
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
} as Meta<typeof Tooltip>;

const Template: StoryFn<typeof Tooltip> = (args) => (
  <Tooltip {...args}>
    <Button color="default" style={{ margin: '5rem 18rem' }}>
      Hover me
    </Button>
  </Tooltip>
);

const ControlledTemplate: StoryFn<typeof Tooltip> = (args) => {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip
      {...args}
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
      }}
    >
      <Button color="default" style={{ margin: '5rem 18rem' }}>
        Hover me
      </Button>
    </Tooltip>
  );
};

export const Default = {
  render: Template,

  args: {
    triggerAsChild: true,
    placement: 'right',
    content: 'This is a nice little tooltip.',
  },
};

export const WithLable = {
  render: Template,

  args: {
    triggerAsChild: true,
    placement: 'right',
    label: 'Label',
    content: 'Your message here. With long text, multiple lines.',
  },
};

export const Controlled = {
  render: ControlledTemplate,

  args: {
    triggerAsChild: true,
    placement: 'right',
    content: 'This is a nice little tooltip.',
  },
};
