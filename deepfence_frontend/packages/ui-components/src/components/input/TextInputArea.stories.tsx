import { Meta } from '@storybook/react';

import TextInputArea from '@/components/input/TextInputArea';

export default {
  title: 'Components/TextInput/TextInputArea',
  component: TextInputArea,
  argTypes: {
    onChange: { action: 'onChange' },
  },
} as Meta<typeof TextInputArea>;

export const Default = {
  args: {},
};

export const WithPlaceholder = {
  args: {
    placeholder: 'Hello Deepfence',
  },
};

export const Disabled = {
  args: {
    placeholder: 'Disabled...',
    disabled: true,
  },
};

export const WithLabel = {
  args: {
    placeholder: 'Hello Deepfence',
    label: 'Comment',
  },
};

export const WithRowsAndColumnn = {
  args: {
    placeholder: 'Hello Deepfence',
    label: 'Comment',
    rows: 10,
    cols: 30,
  },
};
