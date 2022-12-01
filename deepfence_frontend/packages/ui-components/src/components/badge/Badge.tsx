import * as LabelPrimitive from '@radix-ui/react-label';
import cx from 'classnames';
import { ComponentProps, forwardRef, useId } from 'react';
import { IconContext } from 'react-icons';
import { HiX } from 'react-icons/hi';
import { twMerge } from 'tailwind-merge';

import { Typography } from '@/components/typography/Typography';

export type SizeType = 'sm' | 'md';
export type ColorType = 'default' | 'primary' | 'success' | 'danger';
export type SelectedBadgeProps = {
  id: string | number | undefined;
  value: string | number | undefined;
};
export interface BadgeProps extends Omit<ComponentProps<'span'>, 'ref' | 'color'> {
  label?: string;
  value?: string;
  sizing?: SizeType;
  color?: ColorType;
  icon?: React.ReactNode;
  isRemove?: boolean;
  onRemove?: (badge: SelectedBadgeProps) => void;
}

const classes = {
  color: {
    default: 'bg-gray-200 text-gray-900 dark:text-gray-900',
    primary: 'bg-blue-200 text-blue-900 dark:text-blue-900',
    success: 'bg-green-200 text-green-900 dark:text-green-900',
    danger: 'bg-red-200 text-red-900 dark:text-red-900',
  },
  size: {
    sm: `${Typography.size.sm} py-0.5 px-2.5`,
    md: `${Typography.size.base} py-0.5 px-3`,
  },
  icon: {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  },
};

export const Badge = forwardRef<HTMLLabelElement, BadgeProps>(
  (
    {
      label,
      value,
      id,
      icon,
      sizing = 'sm',
      color = 'default',
      className,
      onRemove,
      isRemove = false,
      ...rest
    },
    ref,
  ) => {
    const internalId = useId();
    const _id = id ? id : internalId;

    return (
      <>
        <LabelPrimitive.Root
          className={twMerge(
            cx(
              `${Typography.weight.normal} inline-flex gap-1.5 justify-center items-center rounded-md text-gray-900 dark:text-white`,
              `${classes.size[sizing]}`,
              `${classes.color[color]}`,
            ),
            className,
          )}
          id={_id}
          data-testid={`badge-${_id}`}
        >
          {icon && (
            <IconContext.Provider
              value={{
                className: cx(`${classes.icon[sizing]}`),
              }}
            >
              {icon}
            </IconContext.Provider>
          )}
          <LabelPrimitive.Label ref={ref} {...rest}>
            {label}
          </LabelPrimitive.Label>
          {isRemove && (
            <button
              className="rounded ml-0.5 p-px hover:text-black hover:scale-105 focus:ring-1 focus:ring-blue-600 focus:outline-none "
              onClick={() => onRemove?.({ id: _id, value: value })}
              name={label}
              aria-label={label}
            >
              <HiX />
            </button>
          )}
        </LabelPrimitive.Root>
      </>
    );
  },
);
Badge.displayName = 'Badge';
export default Badge;
