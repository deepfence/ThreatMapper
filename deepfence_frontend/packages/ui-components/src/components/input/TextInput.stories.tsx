import { Meta, StoryObj } from '@storybook/react';
import { AiOutlineMail } from 'react-icons/ai';

import TextInput from '@/components/input/TextInput';

export default {
  title: 'Components/TextInput',
  component: TextInput,
  argTypes: {
    onChange: { action: 'onChange' },
  },
} satisfies Meta<typeof TextInput>;

export const Default: StoryObj<typeof TextInput> = {
  args: {
    disabled: true,
  },
};

export const WithPlaceholder: StoryObj<typeof TextInput> = {
  args: {
    placeholder: 'test@deepfence.io',
    color: 'error',
  },
};

export const Disabled: StoryObj<typeof TextInput> = {
  args: {
    placeholder: 'test@deepfence.io',
    disabled: true,
  },
};

export const WithStartIcon: StoryObj<typeof TextInput> = {
  args: {
    placeholder: 'test@deepfence.io',
    startIcon: <AiOutlineMail />,
    disabled: false,
    color: 'error',
  },
};

export const WithLabel: StoryObj<typeof TextInput> = {
  args: {
    placeholder: 'test@deepfence.io',
    startIcon: <AiOutlineMail />,
    label: 'Username',
  },
};

export const ErrorWithCaption: StoryObj<typeof TextInput> = {
  args: {
    placeholder: 'test@deepfence.io',
    label: 'Username',
    required: true,
    info: 'Some info text',
    color: 'error',
    helperText: 'Please enter valid email.',
  },
};
