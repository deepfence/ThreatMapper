import { Meta } from '@storybook/react';
import { HiMenu } from 'react-icons/hi';

import Button from '@/components/button/Button';

export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    onClick: { action: 'onClick' },
  },
} as Meta<typeof Button>;

export const Large = {
  args: {
    children: 'button',
    size: 'lg',
  },
};
export const Medium = {
  args: {
    children: 'Medium',
    size: 'md',
  },
};
export const Small = {
  args: {
    children: 'Small',
    size: 'sm',
  },
};

export const MediumSuccess = {
  args: {
    children: 'Medium',
    size: 'md',
    color: 'success',
  },
};

export const MediumError = {
  args: {
    children: 'Medium',
    size: 'md',
    color: 'error',
  },
};

export const MediumOutline = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'outline',
  },
};

export const MediumOutlineSuccess = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'outline',
    color: 'success',
  },
};
export const MediumOutlineError = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'outline',
    color: 'error',
  },
};

export const MediumFlatVariant = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'flat',
  },
};

export const MediumWithStartIcon = {
  args: {
    children: 'Refresh',
    startIcon: <HiMenu />,
    size: 'md',
  },
};

export const MediumWithStartAndEndIcon = {
  args: {
    children: 'Both icon',
    startIcon: <HiMenu />,
    endIcon: <HiMenu />,
    size: 'md',
  },
};

export const MediumOutlineWithStartIcon = {
  args: {
    children: 'Refresh',
    startIcon: <HiMenu />,
    size: 'md',
    variant: 'outline',
  },
};

export const MediumWithLoading = {
  args: {
    children: 'Loading',
    size: 'md',
    loading: true,
    color: 'error',
  },
};
export const SmallWithLoading = {
  args: {
    children: 'Loading',
    size: 'sm',
    loading: true,
  },
};
export const LargeWithLoading = {
  args: {
    children: 'Loading',
    size: 'lg',
    loading: true,
  },
};
export const LargeErrorWithLoading = {
  args: {
    children: 'Loading',
    size: 'lg',
    loading: true,
    color: 'error',
  },
};
export const LargeSuccessWithLoading = {
  args: {
    children: 'Loading',
    size: 'lg',
    loading: true,
    color: 'success',
  },
};

export const LargeOutlineWithLoading = {
  args: {
    children: 'Loading',
    size: 'lg',
    loading: true,
    variant: 'outline',
  },
};
export const LargeFlatButtonWithLoading = {
  args: {
    children: 'Loading',
    size: 'lg',
    loading: true,
    variant: 'flat',
  },
};
