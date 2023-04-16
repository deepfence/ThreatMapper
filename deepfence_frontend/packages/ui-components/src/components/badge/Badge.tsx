import * as LabelPrimitive from '@radix-ui/react-label';
import cx from 'classnames';
import React, { ComponentProps, forwardRef, useId } from 'react';
import { IconContext } from 'react-icons';
import { HiX } from 'react-icons/hi';
import { twMerge } from 'tailwind-merge';

import { Typography } from '@/components/typography/Typography';

export type SizeType = 'sm' | 'lg';
export type ColorType = 'default' | 'primary' | 'success' | 'danger';
export type SelectedBadgeProps = {
  id: string | number | undefined;
  value: string | number | undefined;
};
export interface BadgeProps extends Omit<ComponentProps<'span'>, 'ref' | 'color'> {
  label?: React.ReactNode;
  value?: string;
  size?: SizeType;
  color?: ColorType;
  icon?: React.ReactNode;
  isRemove?: boolean;
  onRemove?: (badge: SelectedBadgeProps) => void;
}

const classes = {
  color: {
    default: 'bg-gray-100 text-gray-900 dark:text-gray-900',
    primary: 'bg-blue-100 text-blue-800 dark:text-blue-800',
    success: 'bg-green-100 text-green-800 dark:text-green-800',
    danger: 'bg-red-100 text-red-800 dark:text-red-800',
  },
  size: {
    sm: `${Typography.size.sm} py-0.5 px-2.5`,
    lg: `${Typography.size.base} py-0.5 px-3`,
  },
  icon: {
    sm: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  },
};

export const Badge = forwardRef<HTMLLabelElement, BadgeProps>(
  (
    {
      label,
      value,
      id,
      icon,
      size = 'sm',
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
              `${classes.size[size]}`,
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
                className: cx(`${classes.icon[size]}`),
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
              aria-label={'remove badge'}
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
