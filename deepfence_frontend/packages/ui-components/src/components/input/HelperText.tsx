import cx from 'classnames';
import { FC } from 'react';
import { twMerge } from 'tailwind-merge';

import { Typography } from '@/components/typography/Typography';

export type ColorType = 'default' | 'error' | 'success';
export type SizeType = 'sm' | 'md';

type Props = {
  text: string;
  color: ColorType;
  sizing?: SizeType;
  className?: string;
};

export const classes = {
  color: {
    default: 'border-gray-300 text-gray-500',
    error: 'border-red-500 text-red-700',
    success: 'border-green-500 text-green-700',
  },
  size: {
    sm: `${Typography.size.sm}`,
    md: `${Typography.size.base}`,
  },
};

export const HelperText: FC<Props> = ({ text, sizing = 'sm', color, className }) => {
  return (
    <p
      className={twMerge(
        cx(
          `${Typography.weight.normal} ${classes.color[color]}`,
          `${classes.size[sizing]}`,
        ),
        className,
      )}
    >
      {text}
    </p>
  );
};

export default HelperText;
