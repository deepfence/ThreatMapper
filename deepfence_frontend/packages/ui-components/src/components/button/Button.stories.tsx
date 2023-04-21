import { Meta } from '@storybook/react';
import { useState } from 'react';
import { FaAmazon } from 'react-icons/fa';

import Button from '@/components/button/Button';

export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    onClick: { action: 'onClick' },
  },
} as Meta<typeof Button>;

export const Default = {
  args: {
    children: 'Button text md',
  },
};

export const XXsSize = {
  args: {
    children: 'Button text xxs',
    endIcon: <FaAmazon />,
    size: 'xxs',
  },
};

export const XsSize = {
  args: {
    children: 'Button text md',
    endIcon: <FaAmazon />,
    size: 'xs',
  },
};

export const SMSize = {
  args: {
    children: 'Button text md',
    endIcon: <FaAmazon />,
    size: 'sm',
  },
};

export const MDSize = {
  args: {
    children: 'Button text md',
    endIcon: <FaAmazon />,
  },
};

export const LGSize = {
  args: {
    children: 'Button text md',
    endIcon: <FaAmazon />,
    size: 'lg',
  },
};

export const XLSize = {
  args: {
    children: 'Button text md',
    endIcon: <FaAmazon />,
    size: 'xl',
  },
};

export const NormalButton = {
  args: {
    children: 'Normal text md',
    color: 'normal',
  },
};

export const DefaultDisabled = {
  args: {
    children: 'Default Disabled md size button',
    disabled: true,
  },
};

export const DefaultTextXs = {
  args: {
    children: 'Button text',
    size: 'xs',
  },
};

export const DefaultTextLg = {
  args: {
    children: 'Button text',
    size: 'lg',
  },
};

export const NormalOutline = {
  args: {
    children: 'Button text',
    color: 'normal',
    size: 'xs',
    outline: true,
  },
};

export const Primary = {
  args: {
    children: 'Button text',
    color: 'primary',
    size: 'xs',
  },
};

export const PrimaryWithLoader = {
  args: {
    children: 'Button text',
    color: 'primary',
    size: 'xs',
    loading: true,
  },
};

export const PrimaryWithOutline = {
  args: {
    children: 'Button text',
    color: 'primary',
    size: 'xs',
    outline: true,
  },
};

export const Danger = {
  args: {
    children: 'Button text',
    color: 'danger',
    size: 'xs',
  },
};

export const DangerWithOutline = {
  args: {
    children: 'Button text',
    color: 'danger',
    size: 'xs',
    outline: true,
  },
};

export const Success = {
  args: {
    children: 'Button text',
    color: 'success',
    size: 'xs',
  },
};

export const SuccessWithOutline = {
  args: {
    children: 'Button text',
    color: 'success',
    size: 'xs',
    outline: true,
  },
};

export const PrimaryWithIcon = {
  args: {
    children: 'Button text',
    color: 'primary',
    size: 'xs',
    startIcon: <FaAmazon />,
  },
};

export const PrimaryWithBothIcon = {
  args: {
    children: 'Button text',
    color: 'primary',
    size: 'xs',
    startIcon: <FaAmazon />,
    endIcon: <FaAmazon />,
  },
};

export const XSWithIcon = {
  args: {
    children: 'Button text',
    size: 'xs',
    startIcon: <FaAmazon />,
  },
};

export const DefaultOutlineWithIcon = {
  args: {
    children: 'Button text',
    outline: true,
    size: 'xs',
    startIcon: <FaAmazon />,
  },
};

export const DangerWithIcon = {
  args: {
    children: 'Button text',
    color: 'danger',
    size: 'xs',
    startIcon: <FaAmazon />,
  },
};

export const DangerWithOutlineIcon = {
  args: {
    children: 'Button text',
    color: 'danger',
    outline: true,
    size: 'xs',
    startIcon: <FaAmazon />,
  },
};

export const NormalOutlineButton = {
  args: {
    children: 'Outline Normal text md',
    color: 'normal',
    outline: true,
  },
};

export const ButtonWithLoaderAndStartIcon = () => {
  const [state, setState] = useState(false);
  return (
    <div>
      <Button
        onClick={() => setState(true)}
        loading={state}
        color="primary"
        size="lg"
        startIcon={<FaAmazon />}
      >
        Click to refresh
      </Button>
    </div>
  );
};
