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
    variant: 'outline',
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
    variant: 'flat',
  },
};
export const Info = {
  args: {
    label: 'Label',
    color: 'info',
    variant: 'flat',
  },
};
export const Warning = {
  args: {
    label: 'Label',
    color: 'warning',
    variant: 'flat',
  },
};
export const Error = {
  args: {
    label: 'Label',
    color: 'error',
    variant: 'flat',
  },
};
export const GreyBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'grey',
    variant: 'flat',
  },
};

export const PurpleBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'purple',
    variant: 'flat',
  },
};
export const BlueBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'blue',

    variant: 'flat',
  },
};
export const OrangeBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'orange',

    variant: 'flat',
  },
};
export const BlueLightBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'blueLight',
    variant: 'flat',
  },
};
export const PinkBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'pink',
    variant: 'flat',
  },
};
export const SuccessBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'success',
    variant: 'flat',
  },
};
export const InfoBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'info',

    variant: 'flat',
  },
};
export const WarningBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'warning',
    variant: 'flat',
  },
};
export const ErrorBadge = {
  args: {
    label: '90+',
    size: 'small',
    color: 'error',

    variant: 'flat',
  },
};
