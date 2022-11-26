import * as LabelPrimitive from '@radix-ui/react-label';
import cx from 'classnames';
import React, { ComponentProps, forwardRef, useId } from 'react';
import { IconContext } from 'react-icons';
import { twMerge } from 'tailwind-merge';

import { Typography } from '../typography/Typography';
import HelperText from './HelperText';

export type SizeType = 'sm' | 'md';
export type ColorType = 'default' | 'error' | 'success';

export interface TextInputProps
  extends Omit<ComponentProps<'input'>, 'ref' | 'color' | 'className' | 'size'> {
  sizing?: SizeType;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  color?: ColorType;
  label?: string;
  helperText?: string;
  className?: string;
  required?: boolean;
}

type IconProps = {
  icon: React.ReactNode;
  id?: string;
  color?: ColorType;
  sizing?: SizeType;
};

export const classes = {
  color: {
    default: cx(
      'border-gray-300 text-gray-500',
      'focus:border-blue-600 focus:text-gray-900',
      'dark:border-gray-600 dark:text-gray-400',
      'dark:focus:border-blue-800 dark:focus:text-white dark:active:text-white',
    ),
    error: cx('border-red-500', 'focus:border-red-500'),
    success: cx(
      'border-green-500 text-green-700',
      'focus:border-green-500 focus:text-green-500',
    ),
  },
  size: {
    sm: `${Typography.size.sm} p-3`,
    md: `${Typography.size.base} py-3.5 px-4`,
  },
};

const COLOR_DEFAULT = 'default';
const SIZE_DEFAULT = 'sm';

export const LeftIcon = ({
  icon,
  id,
  color = COLOR_DEFAULT,
  sizing = SIZE_DEFAULT,
}: IconProps) => {
  return (
    <span
      className={cx(
        'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3',
      )}
      data-testid={`textinput-start-icon-${id}`}
    >
      <IconContext.Provider
        value={{
          className: cx(`${classes.color[color]}`, {
            'w-[18px] h-[18px]': sizing === 'sm',
            'w-[20px] h-[20px]': sizing === 'md',
          }),
        }}
      >
        {icon}
      </IconContext.Provider>
    </span>
  );
};

export const RightIcon = ({
  icon,
  id,
  color = COLOR_DEFAULT,
  sizing = SIZE_DEFAULT,
}: IconProps) => {
  return (
    <span
      className={cx(
        'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3',
      )}
      data-testid={`textinput-end-icon-${id}`}
    >
      <IconContext.Provider
        value={{
          className: cx(`${classes.color[color]}`, {
            'w-[18px] h-[18px]': sizing === 'sm',
            'w-[20px] h-[20px]': sizing === 'md',
          }),
        }}
      >
        {icon}
      </IconContext.Provider>
    </span>
  );
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      sizing = SIZE_DEFAULT,
      color = COLOR_DEFAULT,
      label,
      disabled,
      startIcon,
      endIcon,
      helperText,
      className = '',
      required,
      id,
      ...rest
    },
    ref,
  ) => {
    const internalId = useId();
    const _id = id ? id : internalId;
    return (
      <div className={twMerge('flex flex-col gap-2 w-full', className)}>
        {label && (
          <LabelPrimitive.Root
            htmlFor={_id}
            className={cx(`${Typography.weight.medium} text-gray-900 dark:text-white`)}
          >
            {required && <span>*</span>}
            {label}
          </LabelPrimitive.Root>
        )}
        <div className="relative">
          {startIcon && (
            <LeftIcon icon={startIcon} sizing={sizing} color={color} id={_id} />
          )}
          {endIcon && <RightIcon icon={endIcon} sizing={sizing} color={color} id={_id} />}
          <input
            className={cx(
              'block w-full border box-border rounded-lg bg-gray-50 dark:bg-gray-700',
              'focus:outline-none',
              `${classes.color[color]}`,
              `${classes.size[sizing]}`,
              `${Typography.weight.normal}`,
              {
                'disabled:cursor-not-allowed': disabled,
                'pl-[38px]': startIcon,
                'pr-[38px]': endIcon,
                'h-[42px]': sizing === 'sm',
                'h-[52px]': sizing === 'md',
              },
            )}
            disabled={disabled}
            ref={ref}
            id={_id}
            data-testid={`textinput-${_id}`}
            {...rest}
          />
        </div>
        {helperText && (
          <HelperText
            sizing={sizing}
            color={color}
            text={helperText}
            className="mb-2.5"
          />
        )}
      </div>
    );
  },
);

export default TextInput;
