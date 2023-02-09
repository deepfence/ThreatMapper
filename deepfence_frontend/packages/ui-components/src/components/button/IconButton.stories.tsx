import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';

import IconButton from '@/components/button/IconButton';

export default {
  title: 'Components/Button/IconButton',
  component: IconButton,
  argTypes: {
    onClick: { action: 'onClick' },
  },
} as ComponentMeta<typeof IconButton>;

const Template: ComponentStory<typeof IconButton> = (args) => <IconButton {...args} />;

export const Default = Template.bind({});
Default.args = {
  icon: <FaPlus />,
};

export const DefaultDisabled = Template.bind({});
DefaultDisabled.args = {
  disabled: true,
  icon: <FaPlus />,
};

export const PrimaryIconXs = Template.bind({});
PrimaryIconXs.args = {
  icon: <FaPlus />,
  size: 'xs',
  color: 'primary',
};

export const PrimaryIconSm = Template.bind({});
PrimaryIconSm.args = {
  icon: <FaPlus />,
  size: 'sm',
  color: 'primary',
};

export const IconButtonWithLoader = () => {
  const [state, setState] = useState(false);
  return (
    <div>
      <IconButton
        onClick={() => setState(true)}
        loading={state}
        color="primary"
        icon={<FaPlus />}
      >
        Click to refresh
      </IconButton>
    </div>
  );
};

export const PrimaryIconLg = Template.bind({});
PrimaryIconLg.args = {
  icon: <FaPlus />,
  size: 'lg',
  color: 'primary',
};

export const PrimaryIconXl = Template.bind({});
PrimaryIconXl.args = {
  icon: <FaPlus />,
  size: 'xl',
  color: 'primary',
};

export const PrimaryWithOutline = Template.bind({});
PrimaryWithOutline.args = {
  icon: <FaPlus />,
  color: 'primary',
  size: 'xs',
  outline: true,
};

export const PrimaryWithOutlineLg = Template.bind({});
PrimaryWithOutlineLg.args = {
  icon: <FaPlus />,
  color: 'primary',
  size: 'lg',
  outline: true,
};

export const Danger = Template.bind({});
Danger.args = {
  icon: <FaPlus />,
  color: 'danger',
  size: 'xs',
};

export const DangerWithOutline = Template.bind({});
DangerWithOutline.args = {
  icon: <FaPlus />,
  color: 'danger',
  size: 'xs',
  outline: true,
};

export const Success = Template.bind({});
Success.args = {
  icon: <FaPlus />,
  color: 'success',
  size: 'xs',
};

export const SuccessWithOutline = Template.bind({});
SuccessWithOutline.args = {
  icon: <FaPlus />,
  color: 'success',
  size: 'xs',
  outline: true,
};
