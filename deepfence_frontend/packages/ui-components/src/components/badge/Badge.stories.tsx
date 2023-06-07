import { Meta } from '@storybook/react';

import Badge from '@/components/badge/Badge';

export default {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    onClick: { action: 'onClick' },
  },
} as Meta<typeof Badge>;

export const Default = {
  args: {
    label: 'Label',
  },
};

export const Grey = {
  args: {
    label: 'Label',
    color: 'grey',
  },
};

export const Purple = {
  args: {
    label: 'Label',
    color: 'purple',
  },
};
export const Blue = {
  args: {
    label: 'Label',
    color: 'blue',
  },
};
export const Orange = {
  args: {
    label: 'Label',
    color: 'orange',
  },
};
export const BlueLight = {
  args: {
    label: 'Label',
    color: 'blueLight',
  },
};
export const Success = {
  args: {
    label: 'Label',
    color: 'success',
  },
};
export const Info = {
  args: {
    label: 'Label',
    color: 'info',
  },
};
export const Warning = {
  args: {
    label: 'Label',
    color: 'warning',
  },
};
export const Error = {
  args: {
    label: 'Label',
    color: 'error',
  },
};
export const GreyBadge = {
  args: {
    value: '90+',
    color: 'grey',
  },
};

export const PurpleBadge = {
  args: {
    value: '90+',
    color: 'purple',
  },
};
export const BlueBadge = {
  args: {
    value: '90+',
    color: 'blue',
  },
};
export const OrangeBadge = {
  args: {
    value: '90+',
    color: 'orange',
  },
};
export const BlueLightBadge = {
  args: {
    value: '90+',
    color: 'blueLight',
  },
};
export const SuccessBadge = {
  args: {
    value: '90+',
    color: 'success',
  },
};
export const InfoBadge = {
  args: {
    value: '90+',
    color: 'info',
  },
};
export const WarningBadge = {
  args: {
    value: '90+',
    color: 'warning',
  },
};
export const ErrorBadge = {
  args: {
    value: '90+',
    color: 'error',
  },
};

export const GreyLabelBadge = {
  args: {
    value: '90+',
    label: 'Label',
    color: 'grey',
  },
};

export const PurpleLabelBadge = {
  args: {
    value: '90+',
    label: 'Label',
    color: 'purple',
  },
};
export const BlueLabelBadge = {
  args: {
    value: '90+',
    label: 'Label',
    color: 'blue',
  },
};
export const OrangeLabelBadge = {
  args: {
    value: '90+',
    label: 'Label',
    color: 'orange',
  },
};
export const BlueLightLabelBadge = {
  args: {
    value: '90+',
    label: 'Label',
    color: 'blueLight',
  },
};
