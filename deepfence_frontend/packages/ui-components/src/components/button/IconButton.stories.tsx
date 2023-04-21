import { Meta } from '@storybook/react';
import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';

import IconButton from '@/components/button/IconButton';

export default {
  title: 'Components/Button/IconButton',
  component: IconButton,
  argTypes: {
    onClick: { action: 'onClick' },
  },
} as Meta<typeof IconButton>;

export const Default = {
  args: {
    icon: <FaPlus />,
  },
};

export const DefaultDisabled = {
  args: {
    disabled: true,
    icon: <FaPlus />,
  },
};

export const PrimaryIconXs = {
  args: {
    icon: <FaPlus />,
    size: 'xs',
    color: 'primary',
  },
};

export const PrimaryIconSm = {
  args: {
    icon: <FaPlus />,
    size: 'sm',
    color: 'primary',
  },
};

export const IconButtonWithLoader = () => {
  const [state, setState] = useState(false);
  return (
    <div>
      <IconButton
        onClick={() => setState(true)}
        loading={state}
        color="primary"
        icon={<FaPlus />}
      >
        Click to refresh
      </IconButton>
    </div>
  );
};

export const PrimaryIconLg = {
  args: {
    icon: <FaPlus />,
    size: 'lg',
    color: 'primary',
  },
};

export const PrimaryIconXl = {
  args: {
    icon: <FaPlus />,
    size: 'xl',
    color: 'primary',
  },
};

export const PrimaryWithOutline = {
  args: {
    icon: <FaPlus />,
    color: 'primary',
    size: 'xs',
    outline: true,
  },
};

export const PrimaryWithOutlineLg = {
  args: {
    icon: <FaPlus />,
    color: 'primary',
    size: 'lg',
    outline: true,
  },
};

export const Danger = {
  args: {
    icon: <FaPlus />,
    color: 'danger',
    size: 'xs',
  },
};

export const DangerWithOutline = {
  args: {
    icon: <FaPlus />,
    color: 'danger',
    size: 'xs',
    outline: true,
  },
};

export const Success = {
  args: {
    icon: <FaPlus />,
    color: 'success',
    size: 'xs',
  },
};

export const SuccessWithOutline = {
  args: {
    icon: <FaPlus />,
    color: 'success',
    size: 'xs',
    outline: true,
  },
};
