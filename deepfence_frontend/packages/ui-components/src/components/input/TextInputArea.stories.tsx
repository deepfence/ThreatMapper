import { Meta, StoryObj } from '@storybook/react';

import TextInputArea from '@/components/input/TextInputArea';

export default {
  title: 'Components/TextInput/TextInputArea',
  component: TextInputArea,
  argTypes: {
    onChange: { action: 'onChange' },
  },
} satisfies Meta<typeof TextInputArea>;

export const Default: StoryObj<typeof TextInputArea> = {
  args: {},
};

export const WithPlaceholder: StoryObj<typeof TextInputArea> = {
  args: {
    placeholder: 'Hello Deepfence',
  },
};

export const Disabled: StoryObj<typeof TextInputArea> = {
  args: {
    placeholder: 'Disabled...',
    disabled: true,
  },
};

export const WithLabel: StoryObj<typeof TextInputArea> = {
  args: {
    placeholder: 'Hello Deepfence',
    label: 'Comment',
  },
};

export const WithRowsAndColumnn: StoryObj<typeof TextInputArea> = {
  args: {
    placeholder: 'Hello Deepfence',
    label: 'Comment',
    rows: 10,
    cols: 30,
  },
};
