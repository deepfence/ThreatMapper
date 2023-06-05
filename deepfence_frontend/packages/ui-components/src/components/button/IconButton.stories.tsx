import { Meta } from '@storybook/react';
import { HiMenu } from 'react-icons/hi';

import IconButton from '@/components/button/IconButton';

export default {
  title: 'Components/Button/IconButton',
  component: IconButton,
  argTypes: {
    onClick: { action: 'onClick' },
  },
} as Meta<typeof IconButton>;

export const Large = {
  args: {
    children: 'Large',
    size: 'lg',
    icon: <HiMenu />,
  },
};
export const Medium = {
  args: {
    children: 'Medium',
    size: 'md',
    icon: <HiMenu />,
  },
};
export const Small = {
  args: {
    children: 'Small',
    size: 'sm',
    icon: <HiMenu />,
  },
};

export const MediumSuccess = {
  args: {
    children: 'Medium',
    size: 'md',
    color: 'success',
    icon: <HiMenu />,
  },
};

export const MediumError = {
  args: {
    children: 'Medium',
    size: 'md',
    color: 'error',
    icon: <HiMenu />,
  },
};

export const MediumOutline = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'outline',
    icon: <HiMenu />,
  },
};

export const MediumOutlineSuccess = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'outline',
    color: 'success',
    icon: <HiMenu />,
  },
};
export const MediumOutlineError = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'outline',
    color: 'error',
    icon: <HiMenu />,
  },
};

export const MediumFlatVariant = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'flat',
    icon: <HiMenu />,
  },
};

export const MediumWithLoading = {
  args: {
    children: 'Loading',
    size: 'md',
    loading: true,
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
