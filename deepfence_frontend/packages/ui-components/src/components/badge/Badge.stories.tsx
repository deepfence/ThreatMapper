import { Meta } from '@storybook/react';

import Badge from '@/components/badge/Badge';

const TimesIcon = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.54828 6.99998L10.7722 3.77609C10.9043 3.62179 10.8954 3.39179 10.7518 3.24815C10.6081 3.1045 10.3781 3.09562 10.2238 3.22775L6.99995 6.45164L3.77606 3.22387C3.62357 3.07137 3.37633 3.07137 3.22384 3.22387C3.07134 3.37636 3.07134 3.6236 3.22384 3.77609L6.45161 6.99998L3.22384 10.2239C3.11286 10.3189 3.06452 10.4681 3.09869 10.6102C3.13286 10.7523 3.24378 10.8632 3.38584 10.8973C3.5279 10.9315 3.67713 10.8832 3.77217 10.7722L6.99995 7.54831L10.2238 10.7722C10.3781 10.9043 10.6081 10.8955 10.7518 10.7518C10.8954 10.6082 10.9043 10.3782 10.7722 10.2239L7.54828 6.99998Z"
        fill="currentColor"
      />
    </svg>
  );
};

export default {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    onClick: { action: 'onClick' },
  },
} satisfies Meta<typeof Badge>;

export const Default: Meta<typeof Badge> = {
  args: {
    label: 'Label123',
    startIcon: <TimesIcon />,
    endIcon: <TimesIcon />,
    onStartIconClick: () => {
      console.log('Start icon clicked');
    },
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
    startIcon: <TimesIcon />,
    endIcon: <TimesIcon />,
    onStartIconClick: () => {
      console.log('Start icon clicked');
    },
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
