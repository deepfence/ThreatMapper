import * as LabelPrimitive from '@radix-ui/react-label';
import cx from 'classnames';
import React, { ComponentProps, forwardRef, useId } from 'react';
import { IconContext } from 'react-icons';

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
}

type IconProps = {
  icon: React.ReactNode;
  color?: ColorType;
  sizing?: SizeType;
};

export const classes = {
  color: {
    default: 'border-gray-300 text-gray-500',
    error: 'border-red-500 text-red-700 focus:ring-0',
    success: 'border-green-500 text-green-700 focus:ring-0',
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
  color = COLOR_DEFAULT,
  sizing = SIZE_DEFAULT,
}: IconProps) => {
  return (
    <span
      className={cx(
        'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3',
      )}
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
  color = COLOR_DEFAULT,
  sizing = SIZE_DEFAULT,
}: IconProps) => {
  return (
    <span
      className={cx(
        'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3',
      )}
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
      id,
      ...rest
    },
    ref,
  ) => {
    const internalId = useId();
    const inputId = id ? id : internalId;
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <LabelPrimitive.Root
            htmlFor={inputId}
            className={cx(`${Typography.weight.medium} text-gray-900`)}
          >
            {label}
          </LabelPrimitive.Root>
        )}
        <div className="relative">
          {startIcon && <LeftIcon icon={startIcon} sizing={sizing} color={color} />}
          {endIcon && <RightIcon icon={endIcon} sizing={sizing} color={color} />}
          <input
            className={cx(
              'block w-full border rounded-lg bg-gray-50 box-border',
              'focus:outline-none focus:ring-1 focus:ring-blue-600',
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
            id={inputId}
            data-testid={inputId}
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
