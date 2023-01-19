import { ComponentMeta, ComponentStory } from '@storybook/react';
import { FaAmazon } from 'react-icons/fa';

import Button from '@/components/button/Button';

export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    onClick: { action: 'onClick' },
  },
} as ComponentMeta<typeof Button>;

const Template: ComponentStory<typeof Button> = (args) => <Button {...args} />;

export const Default = Template.bind({});
Default.args = {
  children: 'Button text md',
};

export const XsSize = Template.bind({});
XsSize.args = {
  children: 'Button text md',
  endIcon: <FaAmazon />,
  size: 'xs',
};

export const SMSize = Template.bind({});
SMSize.args = {
  children: 'Button text md',
  endIcon: <FaAmazon />,
  size: 'sm',
};

export const MDSize = Template.bind({});
MDSize.args = {
  children: 'Button text md',
  endIcon: <FaAmazon />,
};

export const LGSize = Template.bind({});
LGSize.args = {
  children: 'Button text md',
  endIcon: <FaAmazon />,
  size: 'lg',
};

export const XLSize = Template.bind({});
XLSize.args = {
  children: 'Button text md',
  endIcon: <FaAmazon />,
  size: 'xl',
};

export const NormalButton = Template.bind({});
NormalButton.args = {
  children: 'Normal text md',
  color: 'normal',
};

export const DefaultDisabled = Template.bind({});
DefaultDisabled.args = {
  children: 'Default Disabled md size button',
  disabled: true,
};

export const DefaultTextXs = Template.bind({});
DefaultTextXs.args = {
  children: 'Button text',
  size: 'xs',
};

export const DefaultTextLg = Template.bind({});
DefaultTextLg.args = {
  children: 'Button text',
  size: 'lg',
};

export const NormalOutline = Template.bind({});
NormalOutline.args = {
  children: 'Button text',
  color: 'normal',
  size: 'xs',
  outline: true,
};

export const Primary = Template.bind({});
Primary.args = {
  children: 'Button text',
  color: 'primary',
  size: 'xs',
};

export const PrimaryWithOutline = Template.bind({});
PrimaryWithOutline.args = {
  children: 'Button text',
  color: 'primary',
  size: 'xs',
  outline: true,
};

export const Danger = Template.bind({});
Danger.args = {
  children: 'Button text',
  color: 'danger',
  size: 'xs',
};

export const DangerWithOutline = Template.bind({});
DangerWithOutline.args = {
  children: 'Button text',
  color: 'danger',
  size: 'xs',
  outline: true,
};

export const Success = Template.bind({});
Success.args = {
  children: 'Button text',
  color: 'success',
  size: 'xs',
};

export const SuccessWithOutline = Template.bind({});
SuccessWithOutline.args = {
  children: 'Button text',
  color: 'success',
  size: 'xs',
  outline: true,
};

export const PrimaryWithIcon = Template.bind({});
PrimaryWithIcon.args = {
  children: 'Button text',
  color: 'primary',
  size: 'xs',
  startIcon: <FaAmazon />,
};

export const PrimaryWithBothIcon = Template.bind({});
PrimaryWithBothIcon.args = {
  children: 'Button text',
  color: 'primary',
  size: 'xs',
  startIcon: <FaAmazon />,
  endIcon: <FaAmazon />,
};

export const XSWithIcon = Template.bind({});
XSWithIcon.args = {
  children: 'Button text',
  size: 'xs',
  startIcon: <FaAmazon />,
};

export const DefaultOutlineWithIcon = Template.bind({});
DefaultOutlineWithIcon.args = {
  children: 'Button text',
  outline: true,
  size: 'xs',
  startIcon: <FaAmazon />,
};

export const DangerWithIcon = Template.bind({});
DangerWithIcon.args = {
  children: 'Button text',
  color: 'danger',
  size: 'xs',
  startIcon: <FaAmazon />,
};

export const DangerWithOutlineIcon = Template.bind({});
DangerWithOutlineIcon.args = {
  children: 'Button text',
  color: 'danger',
  outline: true,
  size: 'xs',
  startIcon: <FaAmazon />,
};
export const NormalOutlineButton = Template.bind({});
NormalOutlineButton.args = {
  children: 'Outline Normal text md',
  color: 'normal',
  outline: true,
};
