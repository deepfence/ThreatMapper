import { Meta } from '@storybook/react';

import Button from '@/components/button/Button';
import { PlusIcon } from '@/components/icons/Plus';

const Plus = () => (
  <span className="h-4 w-4">
    <PlusIcon />
  </span>
);

const FilterIcon = () => {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.8334 4.27783H1.16672C0.951944 4.27783 0.777832 4.45194 0.777832 4.66672C0.777832 4.8815 0.951944 5.05561 1.16672 5.05561H12.8334C13.0482 5.05561 13.2223 4.8815 13.2223 4.66672C13.2223 4.45194 13.0482 4.27783 12.8334 4.27783ZM10.8889 6.61117H3.11117C2.89639 6.61117 2.72228 6.78528 2.72228 7.00005C2.72228 7.21483 2.89639 7.38894 3.11117 7.38894H10.8889C11.1037 7.38894 11.2778 7.21483 11.2778 7.00005C11.2778 6.78528 11.1037 6.61117 10.8889 6.61117ZM5.05561 8.9445H8.9445C9.15928 8.9445 9.33339 9.11861 9.33339 9.33339C9.33339 9.54817 9.15928 9.72228 8.9445 9.72228H5.05561C4.84083 9.72228 4.66672 9.54817 4.66672 9.33339C4.66672 9.11861 4.84083 8.9445 5.05561 8.9445Z"
        fill="currentColor"
      />
    </svg>
  );
};
export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    onClick: { action: 'onClick' },
  },
} satisfies Meta<typeof Button>;

export const Large: Meta<typeof Button> = {
  args: {
    children: 'button',
    size: 'lg',
  },
};
export const Medium: Meta<typeof Button> = {
  args: {
    children: 'Medium',
    size: 'md',
  },
};
export const Small: Meta<typeof Button> = {
  args: {
    children: 'Small',
    size: 'sm',
  },
};

export const MediumSuccess: Meta<typeof Button> = {
  args: {
    children: 'Medium',
    size: 'md',
    color: 'success',
  },
};

export const MediumError: Meta<typeof Button> = {
  args: {
    children: 'Medium',
    size: 'md',
    color: 'error',
  },
};

export const MediumOutline: Meta<typeof Button> = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'outline',
  },
};

export const MediumOutlineSuccess: Meta<typeof Button> = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'outline',
    color: 'success',
  },
};
export const MediumOutlineError: Meta<typeof Button> = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'outline',
    color: 'error',
  },
};

export const MediumFlatVariant: Meta<typeof Button> = {
  args: {
    children: 'Medium',
    size: 'md',
    variant: 'flat',
    startIcon: <FilterIcon />,
  },
};

export const MediumWithStartIcon: Meta<typeof Button> = {
  args: {
    children: 'Refresh',
    startIcon: <Plus />,
    size: 'md',
  },
};

export const MediumWithStartAndEndIcon: Meta<typeof Button> = {
  args: {
    children: 'Both icon',
    startIcon: <Plus />,
    endIcon: <Plus />,
    size: 'md',
  },
};

export const MediumOutlineWithStartIcon: Meta<typeof Button> = {
  args: {
    children: 'Refresh',
    startIcon: <Plus />,
    size: 'md',
    variant: 'outline',
  },
};

export const MediumWithLoading: Meta<typeof Button> = {
  args: {
    children: 'Loading',
    size: 'md',
    loading: true,
    color: 'error',
  },
};
export const SmallWithLoading: Meta<typeof Button> = {
  args: {
    children: 'Loading',
    size: 'sm',
    loading: true,
  },
};
export const LargeWithLoading: Meta<typeof Button> = {
  args: {
    children: 'Loading',
    size: 'lg',
    loading: true,
  },
};
export const LargeErrorWithLoading: Meta<typeof Button> = {
  args: {
    children: 'Loading',
    size: 'lg',
    loading: true,
    color: 'error',
  },
};
export const LargeSuccessWithLoading: Meta<typeof Button> = {
  args: {
    children: 'Loading',
    size: 'lg',
    loading: true,
    color: 'success',
  },
};

export const LargeOutlineWithLoading: Meta<typeof Button> = {
  args: {
    children: 'Loading',
    size: 'lg',
    loading: true,
    variant: 'outline',
  },
};
export const LargeFlatButtonWithLoading: Meta<typeof Button> = {
  args: {
    children: 'Loading',
    size: 'lg',
    loading: true,
    variant: 'flat',
  },
};
