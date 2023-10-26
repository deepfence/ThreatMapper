import { Meta } from '@storybook/react';

import { Alert } from '@/components/alert/Alert';

export default {
  title: 'Components/Alert',
  component: Alert,
} as Meta<typeof Alert>;

export const Default = {
  args: {
    text: 'Welcome to deepfence portal.',
    action: 'Action',
  },
};
