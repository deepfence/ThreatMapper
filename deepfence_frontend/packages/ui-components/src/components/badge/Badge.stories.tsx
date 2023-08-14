import { Meta } from '@storybook/react';

import Badge from '@/components/badge/Badge';

export default {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    onClick: { action: 'onClick' },
  },
} satisfies Meta<typeof Badge>;

export const Default: Meta<typeof Badge> = {
  args: {
    label: 'Label',
  },
};

export const Grey: Meta<typeof Badge> = {
  args: {
    label: 'Label',
    color: 'grey',
    variant: 'outlined',
  },
};

export const Purple: Meta<typeof Badge> = {
  args: {
    label: 'Label',
    color: 'purple',
  },
};
export const Blue: Meta<typeof Badge> = {
  args: {
    label: 'Label',
    color: 'blue',
  },
};
export const Orange: Meta<typeof Badge> = {
  args: {
    label: 'Label',
    color: 'orange',
  },
};
export const BlueLight: Meta<typeof Badge> = {
  args: {
    label: 'Label',
    color: 'blueLight',
  },
};
export const Pink: Meta<typeof Badge> = {
  args: {
    label: 'Label',
    color: 'pink',
  },
};
export const Success: Meta<typeof Badge> = {
  args: {
    label: 'Label',
    color: 'success',
    variant: 'filled',
  },
};
export const Info: Meta<typeof Badge> = {
  args: {
    label: 'Label',
    color: 'info',
    variant: 'filled',
  },
};
export const Warning: Meta<typeof Badge> = {
  args: {
    label: 'Label',
    color: 'warning',
    variant: 'filled',
  },
};
export const Error: Meta<typeof Badge> = {
  args: {
    label: 'Label',
    color: 'error',
    variant: 'filled',
  },
};
export const GreyBadge: Meta<typeof Badge> = {
  args: {
    label: '90+',
    size: 'small',
    color: 'grey',
    variant: 'filled',
  },
};

export const PurpleBadge: Meta<typeof Badge> = {
  args: {
    label: '90+',
    size: 'small',
    color: 'purple',
    variant: 'filled',
  },
};
export const BlueBadge: Meta<typeof Badge> = {
  args: {
    label: '90+',
    size: 'small',
    color: 'blue',

    variant: 'filled',
  },
};
export const OrangeBadge: Meta<typeof Badge> = {
  args: {
    label: '90+',
    size: 'small',
    color: 'orange',

    variant: 'filled',
  },
};
export const BlueLightBadge: Meta<typeof Badge> = {
  args: {
    label: '90+',
    size: 'small',
    color: 'blueLight',
    variant: 'filled',
  },
};
export const PinkBadge: Meta<typeof Badge> = {
  args: {
    label: '90+',
    size: 'small',
    color: 'pink',
    variant: 'filled',
  },
};
export const SuccessBadge: Meta<typeof Badge> = {
  args: {
    label: '90+',
    size: 'small',
    color: 'success',
    variant: 'filled',
  },
};
export const InfoBadge: Meta<typeof Badge> = {
  args: {
    label: '90+',
    size: 'small',
    color: 'info',

    variant: 'filled',
  },
};
export const WarningBadge: Meta<typeof Badge> = {
  args: {
    label: '90+',
    size: 'small',
    color: 'warning',
    variant: 'filled',
  },
};
export const ErrorBadge: Meta<typeof Badge> = {
  args: {
    label: '90+',
    size: 'small',
    color: 'error',

    variant: 'filled',
  },
};
