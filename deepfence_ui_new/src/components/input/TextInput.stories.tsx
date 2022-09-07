import { ComponentMeta, ComponentStory } from '@storybook/react';
import { AiOutlineCheck, AiOutlineMail } from 'react-icons/ai';

import TextInput from './TextInput';

export default {
  title: 'Components/TextInput',
  component: TextInput,
  argTypes: {
    onChange: { action: 'onChange' },
  },
} as ComponentMeta<typeof TextInput>;

const Template: ComponentStory<typeof TextInput> = (args) => <TextInput {...args} />;

export const Default = Template.bind({});
Default.args = {};

export const WithPlaceholder = Template.bind({});
WithPlaceholder.args = {
  placeholder: 'test@deepfence.io',
};

export const Disabled = Template.bind({});
Disabled.args = {
  placeholder: 'test@deepfence.io',
  disabled: true,
};

export const WithStartIcon = Template.bind({});
WithStartIcon.args = {
  placeholder: 'test@deepfence.io',
  startIcon: <AiOutlineMail />,
};

export const LargeInput = Template.bind({});
LargeInput.args = {
  placeholder: 'test@deepfence.io',
  startIcon: <AiOutlineMail />,
  sizing: 'md',
};

export const WithLabel = Template.bind({});
WithLabel.args = {
  placeholder: 'test@deepfence.io',
  startIcon: <AiOutlineMail />,
  label: 'Username',
};

export const WithStartAndEndIcon = Template.bind({});
WithStartAndEndIcon.args = {
  placeholder: 'test@deepfence.io',
  startIcon: <AiOutlineMail />,
  endIcon: <AiOutlineCheck />,
};

export const SuccessInput = Template.bind({});
SuccessInput.args = {
  placeholder: 'test@deepfence.io',
  startIcon: <AiOutlineMail />,
  color: 'success',
};

export const WithSuccessCaption = Template.bind({});
WithSuccessCaption.args = {
  placeholder: 'test@deepfence.io',
  startIcon: <AiOutlineMail />,
  endIcon: <AiOutlineCheck />,
  label: 'Username',
  helperText: 'Sent successfully.',
  color: 'success',
};

export const ErrorInput = Template.bind({});
ErrorInput.args = {
  placeholder: 'test@deepfence.io',
  startIcon: <AiOutlineMail />,
  color: 'error',
};

export const ErrorWithCaption = Template.bind({});
ErrorWithCaption.args = {
  placeholder: 'test@deepfence.io',
  startIcon: <AiOutlineMail />,
  color: 'error',
  helperText: 'Please enter valid username.',
};
