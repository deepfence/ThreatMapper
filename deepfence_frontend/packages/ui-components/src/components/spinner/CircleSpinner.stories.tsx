import { ComponentMeta, ComponentStory } from '@storybook/react';

import { CircleSpinner } from '@/components/spinner/CircleSpinner';

export default {
  title: 'Components/CircleSpinner',
  component: CircleSpinner,
} as ComponentMeta<typeof CircleSpinner>;

const Template: ComponentStory<typeof CircleSpinner> = (args) => (
  <CircleSpinner {...args} />
);

export const XS = Template.bind({});
XS.args = {
  size: 'xs',
};

export const SM = Template.bind({});
SM.args = {
  size: 'sm',
};

export const MD = Template.bind({});
MD.args = {
  size: 'md',
};

export const LG = Template.bind({});
LG.args = {
  size: 'lg',
};

export const XL = Template.bind({});
XL.args = {
  size: 'xl',
};

export const Default = Template.bind({});
Default.args = {};
