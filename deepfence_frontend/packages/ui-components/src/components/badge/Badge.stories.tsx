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
    variant: 'outlined',
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
export const Pink = {
  args: {
    label: 'Label',
    color: 'pink',
  },
};
export const Success = {
  args: {
    label: 'Label',
    color: 'success',
    variant: 'filled',
  },
};
export const Info = {
  args: {
    label: 'Label',
    color: 'info',
    variant: 'filled',
  },
};
export const Warning = {
  args: {
    label: 'Label',
    color: 'warning',
    variant: 'filled',
  },
};
export const Error = {
  args: {
    label: 'Label',
    color: 'error',
    variant: 'filled',
  },
};
export const GreyBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'grey',
    variant: 'filled',
  },
};

export const PurpleBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'purple',
    variant: 'filled',
  },
};
export const BlueBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'blue',

    variant: 'filled',
  },
};
export const OrangeBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'orange',

    variant: 'filled',
  },
};
export const BlueLightBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'blueLight',
    variant: 'filled',
  },
};
export const PinkBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'pink',
    variant: 'filled',
  },
};
export const SuccessBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'success',
    variant: 'filled',
  },
};
export const InfoBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'info',

    variant: 'filled',
  },
};
export const WarningBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'warning',
    variant: 'filled',
  },
};
export const ErrorBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'error',

    variant: 'filled',
  },
};
