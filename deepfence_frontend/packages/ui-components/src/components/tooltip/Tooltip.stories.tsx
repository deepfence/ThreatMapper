import { Meta, StoryFn, StoryObj } from '@storybook/react';
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
} satisfies Meta<typeof Tooltip>;

const Template: StoryFn<typeof Tooltip> = (args) => (
  <Tooltip {...args}>
    <Button color="default" style={{ margin: '20rem 18rem' }}>
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

export const Default: StoryObj<typeof Tooltip> = {
  render: Template,

  args: {
    triggerAsChild: true,
    placement: 'right',
    content: 'This is a nice little tooltip.',
  },
};

export const Top: StoryObj<typeof Tooltip> = {
  render: Template,

  args: {
    triggerAsChild: true,
    placement: 'top',
    content: 'Your message here.',
  },
};

export const TopMultiLine: StoryObj<typeof Tooltip> = {
  render: Template,

  args: {
    triggerAsChild: true,
    placement: 'top',
    label: 'Label',
    content: 'Your message here.  Max width 360, height 4 lines.',
  },
};

export const WithLable: StoryObj<typeof Tooltip> = {
  render: Template,

  args: {
    triggerAsChild: true,
    placement: 'top',
    label: 'Label',
    content: 'Your message here. With long text, multiple lines.',
  },
};

export const Controlled: StoryObj<typeof Tooltip> = {
  render: ControlledTemplate,

  args: {
    triggerAsChild: true,
    placement: 'right',
    content: 'This is a nice little tooltip.',
  },
};
