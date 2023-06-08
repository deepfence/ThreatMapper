import { Meta } from '@storybook/react';
import { AiOutlineCheck, AiOutlineMail } from 'react-icons/ai';

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
  },
};

export const LargeInput = {
  args: {
    placeholder: 'test@deepfence.io',
    startIcon: <AiOutlineMail />,
    sizing: 'lg',
  },
};

export const WithLabel = {
  args: {
    placeholder: 'test@deepfence.io',
    startIcon: <AiOutlineMail />,
    label: 'Username',
  },
};

export const WithStartAndEndIcon = {
  args: {
    placeholder: 'test@deepfence.io',
    startIcon: <AiOutlineMail />,
    endIcon: <AiOutlineCheck />,
  },
};

export const WithSuccessCaption = {
  args: {
    placeholder: 'test@deepfence.io',
    startIcon: <AiOutlineMail />,
    endIcon: <AiOutlineCheck />,
    label: 'Username',
    value: 'hello',
    helperText: 'Sent successfully.',
    color: 'success',
  },
};

export const ErrorWithCaption = {
  args: {
    placeholder: 'test@deepfence.io',
    startIcon: <AiOutlineMail />,
    value: 'hello',
    label: 'Username',
    required: true,
    color: 'error',
    helperText: 'Please enter valid email.',
  },
};
