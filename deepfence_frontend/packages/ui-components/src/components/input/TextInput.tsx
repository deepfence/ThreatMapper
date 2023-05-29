import * as LabelPrimitive from '@radix-ui/react-label';
import cx from 'classnames';
import { cva, VariantProps } from 'cva';
import React, { ComponentProps, forwardRef, useId } from 'react';
import { IconContext } from 'react-icons';
import { HiOutlineInformationCircle } from 'react-icons/hi';
import { twMerge } from 'tailwind-merge';

import HelperText from '@/components/input/HelperText';
import { Tooltip } from '@/main';
import { ObjectWithNonNullableValues } from '@/types/utils';

export type SizeType = 'sm' | 'md' | 'lg';
export type ColorType = 'default' | 'error' | 'success';

const inputCva = cva(
  [
    'block w-full ring-1 rounded-lg',
    'font-normal',
    'focus:outline-none',
    'disabled:cursor-not-allowed',
  ],
  {
    variants: {
      color: {
        default: [
          // ring styles
          'ring-gray-300 focus:ring-blue-600',
          'dark:ring-gray-600 dark:focus:ring-blue-600',
          // bg styles
          'bg-gray-50',
          'dark:bg-gray-700',
          // placeholder styles
          'placeholder-gray-500 disabled:placeholder-gray-400',
          'dark:placeholder-gray-400 dark:disabled:placeholder-gray-500',
          // text styles
          'text-gray-900 disabled:text-gray-700',
          'dark:text-white dark:disabled:text-gray-200',
        ],
        error: [
          // ring styles
          'ring-red-200 focus:ring-red-500',
          'dark:ring-red-800 dark:focus:ring-red-500',
          // bg styles
          'bg-red-50',
          'dark:bg-gray-700',
          // placeholder styles
          'placeholder-red-400 disabled:placeholder-red-300',
          'dark:placeholder-red-700 dark:disabled:placeholder-red-800',
          // text styles
          'text-red-700 disabled:text-red-500',
          'dark:text-red-500 dark:disabled:text-red-700',
        ],
        success: [
          // ring styles
          'ring-green-300 focus:ring-green-500',
          'dark:ring-green-800 dark:focus:ring-green-500',
          // bg styles
          'bg-green-50',
          'dark:bg-gray-700',
          // placeholder styles
          'placeholder-green-400 disabled:placeholder-green-300',
          'dark:placeholder-green-700 dark:disabled:placeholder-green-800',
          // text styles
          'text-green-700 disabled:text-green-500',
          'dark:text-green-500 dark:disabled:text-green-700',
        ],
      },
      sizing: {
        sm: `text-sm px-4 py-2`,
        md: `text-sm leading-tight px-4 py-3`,
        lg: `text-base px-4 py-3.5`,
      },
      withStartIcon: {
        true: 'pl-[42px]',
      },
      withEndIcon: {
        true: 'pr-[38px]',
      },
    },
    compoundVariants: [
      {
        sizing: 'lg',
        withStartIcon: true,
        className: 'pl-[48px]',
      },
    ],
    defaultVariants: {
      color: 'default',
      sizing: 'md',
      withStartIcon: false,
      withEndIcon: false,
    },
  },
);

const iconContextCva = cva('', {
  variants: {
    color: {
      default: ['text-gray-500', 'dark:text-gray-400'],
      error: ['text-red-400', 'dark:text-red-700'],
      success: ['text-green-400', 'dark:text-green-700'],
    },
    sizing: {
      sm: `w-4 h-4`,
      md: `w-4 h-4`,
      lg: `w-5 h-5`,
    },
    disabled: { true: '' },
  },
  compoundVariants: [
    {
      color: 'default',
      disabled: true,
      className: ['text-gray-400', 'dark:text-gray-500'],
    },
    {
      color: 'error',
      disabled: true,
      className: ['text-red-300', 'dark:text-red-800'],
    },
    {
      color: 'success',
      disabled: true,
      className: ['text-green-300', 'dark:text-green-800'],
    },
  ],
  defaultVariants: {
    color: 'default',
    sizing: 'md',
    disabled: false,
  },
});

interface IconProps
  extends ObjectWithNonNullableValues<VariantProps<typeof iconContextCva>> {
  icon: React.ReactNode;
  id?: string;
}

export const LeftIcon = ({ icon, id, color, sizing, disabled }: IconProps) => {
  return (
    <span
      className={cx(
        'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4',
      )}
      data-testid={`textinput-start-icon-${id}`}
    >
      <IconContext.Provider
        value={{
          className: iconContextCva({
            color,
            sizing,
            disabled,
          }),
        }}
      >
        {icon}
      </IconContext.Provider>
    </span>
  );
};

export const RightIcon = ({ icon, id, color, sizing, disabled }: IconProps) => {
  return (
    <span
      className={cx(
        'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4',
      )}
      data-testid={`textinput-end-icon-${id}`}
    >
      <IconContext.Provider
        value={{
          className: iconContextCva({
            color,
            sizing,
            disabled,
          }),
        }}
      >
        {icon}
      </IconContext.Provider>
    </span>
  );
};

export interface TextInputProps
  extends Omit<ComponentProps<'input'>, 'ref' | 'color' | 'className' | 'size'>,
    ObjectWithNonNullableValues<
      Omit<VariantProps<typeof inputCva>, 'withStartIcon' | 'withEndIcon'>
    > {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  label?: string;
  helperText?: string;
  className?: string;
  required?: boolean;
  hint?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      sizing,
      color,
      label,
      disabled,
      startIcon,
      endIcon,
      helperText,
      className = '',
      required,
      id,
      hint,
      ...rest
    },
    ref,
  ) => {
    const internalId = useId();
    const _id = id ? id : internalId;
    return (
      <div className={twMerge('flex flex-col gap-2 w-full', className)}>
        {label && (
          <div className="flex gap-2 items-center">
            <LabelPrimitive.Root
              htmlFor={_id}
              className="text-sm font-medium text-gray-900 dark:text-white"
            >
              {required && <span>*</span>}
              {label}
            </LabelPrimitive.Root>
            {!!hint?.length && (
              <Tooltip content={hint} triggerAsChild>
                <button type="button" tabIndex={-1}>
                  <IconContext.Provider
                    value={{
                      className: 'text-gray-600 dark:text-gray-200 h-4 w-4',
                    }}
                  >
                    <HiOutlineInformationCircle />
                  </IconContext.Provider>
                </button>
              </Tooltip>
            )}
          </div>
        )}
        <div className="relative">
          {startIcon && (
            <LeftIcon
              icon={startIcon}
              sizing={sizing}
              color={color}
              id={_id}
              disabled={disabled}
            />
          )}
          {endIcon && (
            <RightIcon
              icon={endIcon}
              sizing={sizing}
              color={color}
              id={_id}
              disabled={disabled}
            />
          )}
          <input
            className={twMerge(
              inputCva({
                color,
                sizing,
                withStartIcon: !!startIcon,
                withEndIcon: !!endIcon,
              }),
            )}
            disabled={disabled}
            ref={ref}
            id={_id}
            data-testid={`textinput-${_id}`}
            {...rest}
          />
        </div>
        {helperText && <HelperText color={color} text={helperText} className="mb-2.5" />}
      </div>
    );
  },
);

export default TextInput;
