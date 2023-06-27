import { Meta } from '@storybook/react';
import { AiOutlineMail } from 'react-icons/ai';

import TextInput from '@/components/input/TextInput';

export default {
  title: 'Components/TextInput',
  component: TextInput,
  argTypes: {
    onChange: { action: 'onChange' },
  },
} as Meta<typeof TextInput>;

export const Default = {
  args: {
    disabled: true,
  },
};

export const WithPlaceholder = {
  args: {
    placeholder: 'test@deepfence.io',
    color: 'error',
  },
};

export const Disabled = {
  args: {
    placeholder: 'test@deepfence.io',
    disabled: true,
  },
};

export const WithStartIcon = {
  args: {
    placeholder: 'test@deepfence.io',
    startIcon: <AiOutlineMail />,
    disabled: false,
    color: 'error',
  },
};

export const WithLabel = {
  args: {
    placeholder: 'test@deepfence.io',
    startIcon: <AiOutlineMail />,
    label: 'Username',
  },
};

export const ErrorWithCaption = {
  args: {
    placeholder: 'test@deepfence.io',
    label: 'Username',
    required: true,
    info: 'Some info text',
    color: 'error',
    helperText: 'Please enter valid email.',
  },
};
