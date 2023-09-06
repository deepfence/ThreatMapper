import { Meta } from '@storybook/react';

import IconButton from '@/components/button/IconButton';
import { PlusIcon } from '@/components/icons/Plus';

const Plus = () => (
  <span className="h-4 w-4">
    <PlusIcon />
  </span>
);

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
    icon: <Plus />,
  },
};
export const Medium: Meta<typeof IconButton> = {
  args: {
    children: 'Medium',
    size: 'md',
    icon: <Plus />,
  },
};
export const Small: Meta<typeof IconButton> = {
  args: {
    children: 'Small',
    size: 'sm',
    icon: <Plus />,
  },
};

export const MediumSuccess: Meta<typeof IconButton> = {
  args: {
    children: 'Medium',
    size: 'md',
    color: 'success',
    icon: <Plus />,
  },
};

export const MediumError: Meta<typeof IconButton> = {
  args: {
    children: 'Medium',
    size: 'md',
    color: 'error',
    icon: <Plus />,
  },
};

export const MediumOutline: Meta<typeof IconButton> = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'outline',
    icon: <Plus />,
  },
};

export const MediumOutlineSuccess: Meta<typeof IconButton> = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'outline',
    color: 'success',
    icon: <Plus />,
  },
};
export const MediumOutlineError: Meta<typeof IconButton> = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'outline',
    color: 'error',
    icon: <Plus />,
  },
};

export const MediumFlatVariant: Meta<typeof IconButton> = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'flat',
    icon: <Plus />,
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
