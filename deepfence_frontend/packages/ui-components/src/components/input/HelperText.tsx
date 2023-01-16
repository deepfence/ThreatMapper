import cx from 'classnames';
import { FC } from 'react';
import { twMerge } from 'tailwind-merge';

export type ColorType = 'default' | 'error' | 'success';

type Props = {
  text: string;
  color: ColorType;
  className?: string;
};

export const classes = {
  color: {
    default: 'text-gray-500 dark:text-gray-400',
    error: 'text-red-600 dark:text-red-600',
    success: 'text-green-600 dark:text-green-600',
  },
};

export const HelperText: FC<Props> = ({ text, color, className }) => {
  return (
    <p
      className={twMerge(
        cx('leading-tight text-sm fornt-normal', `${classes.color[color]}`),
        className,
      )}
    >
      {text}
    </p>
  );
};

export default HelperText;
