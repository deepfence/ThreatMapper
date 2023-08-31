import { Meta } from '@storybook/react';
import { HiMenu } from 'react-icons/hi';

import IconButton from '@/components/button/IconButton';

export default {
  title: 'Components/Button/IconButton',
  component: IconButton,
  argTypes: {
    onClick: { action: 'onClick' },
  },
} satisfies Meta<typeof IconButton>;

export const Large: Meta<typeof IconButton> = {
  args: {
    children: 'Large',
    size: 'lg',
    icon: <HiMenu />,
  },
};
export const Medium: Meta<typeof IconButton> = {
  args: {
    children: 'Medium',
    size: 'md',
    icon: <HiMenu />,
  },
};
export const Small: Meta<typeof IconButton> = {
  args: {
    children: 'Small',
    size: 'sm',
    icon: <HiMenu />,
  },
};

export const MediumSuccess: Meta<typeof IconButton> = {
  args: {
    children: 'Medium',
    size: 'md',
    color: 'success',
    icon: <HiMenu />,
  },
};

export const MediumError: Meta<typeof IconButton> = {
  args: {
    children: 'Medium',
    size: 'md',
    color: 'error',
    icon: <HiMenu />,
  },
};

export const MediumOutline: Meta<typeof IconButton> = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'outline',
    icon: <HiMenu />,
  },
};

export const MediumOutlineSuccess: Meta<typeof IconButton> = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'outline',
    color: 'success',
    icon: <HiMenu />,
  },
};
export const MediumOutlineError: Meta<typeof IconButton> = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'outline',
    color: 'error',
    icon: <HiMenu />,
  },
};

export const MediumFlatVariant: Meta<typeof IconButton> = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'flat',
    icon: <HiMenu />,
  },
};

export const MediumWithLoading: Meta<typeof IconButton> = {
  args: {
    children: 'Loading',
    size: 'md',
    loading: true,
  },
};
export const SmallWithLoading: Meta<typeof IconButton> = {
  args: {
    children: 'Loading',
    size: 'sm',
    loading: true,
  },
};
export const LargeWithLoading: Meta<typeof IconButton> = {
  args: {
    children: 'Loading',
    size: 'lg',
    loading: true,
  },
};
