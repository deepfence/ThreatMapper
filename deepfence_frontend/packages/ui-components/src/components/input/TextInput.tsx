import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, VariantProps } from 'cva';
import React, { ComponentProps, forwardRef, useId, useState } from 'react';
import { cn } from 'tailwind-preset';

import HelperText from '@/components/input/HelperText';
import { Tooltip } from '@/main';
import { ObjectWithNonNullableValues } from '@/types/utils';

export type SizeType = 'md';
export type ColorType = 'default' | 'error';

const PLACEHOLDER_PASSWORD = '**********';
export const ErrorIcon = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 12C4 7.58172 7.58172 4 12 4C14.1217 4 16.1566 4.84285 17.6569 6.34315C19.1571 7.84344 20 9.87827 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12ZM11.1333 12.5133C11.1333 12.992 11.5214 13.38 12 13.38C12.4786 13.38 12.8667 12.992 12.8667 12.5133V8.51333C12.8667 8.03469 12.4786 7.64667 12 7.64667C11.5214 7.64667 11.1333 8.03469 11.1333 8.51333V12.5133ZM12 18.6667C8.3181 18.6667 5.33333 15.6819 5.33333 12C5.33333 8.3181 8.3181 5.33333 12 5.33333C15.6819 5.33333 18.6667 8.3181 18.6667 12C18.6667 13.7681 17.9643 15.4638 16.714 16.714C15.4638 17.9643 13.7681 18.6667 12 18.6667ZM12.9667 15.3467C12.9667 15.899 12.519 16.3467 11.9667 16.3467C11.4144 16.3467 10.9667 15.899 10.9667 15.3467C10.9667 14.7944 11.4144 14.3467 11.9667 14.3467C12.519 14.3467 12.9667 14.7944 12.9667 15.3467Z"
        fill="black"
      />
      <mask
        id="mask0_0_2401"
        maskUnits="userSpaceOnUse"
        x="4"
        y="4"
        width="16"
        height="16"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M4 12C4 7.58172 7.58172 4 12 4C14.1217 4 16.1566 4.84285 17.6569 6.34315C19.1571 7.84344 20 9.87827 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12ZM11.1333 12.5133C11.1333 12.992 11.5214 13.38 12 13.38C12.4786 13.38 12.8667 12.992 12.8667 12.5133V8.51333C12.8667 8.03469 12.4786 7.64667 12 7.64667C11.5214 7.64667 11.1333 8.03469 11.1333 8.51333V12.5133ZM12 18.6667C8.3181 18.6667 5.33333 15.6819 5.33333 12C5.33333 8.3181 8.3181 5.33333 12 5.33333C15.6819 5.33333 18.6667 8.3181 18.6667 12C18.6667 13.7681 17.9643 15.4638 16.714 16.714C15.4638 17.9643 13.7681 18.6667 12 18.6667ZM12.9667 15.3467C12.9667 15.899 12.519 16.3467 11.9667 16.3467C11.4144 16.3467 10.9667 15.899 10.9667 15.3467C10.9667 14.7944 11.4144 14.3467 11.9667 14.3467C12.519 14.3467 12.9667 14.7944 12.9667 15.3467Z"
          fill="white"
        />
      </mask>
      <g mask="url(#mask0_0_2401)">
        <rect width="24" height="24" fill="currentColor" />
      </g>
    </svg>
  );
};
const PasswordIcon = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.3867 7.79112C13.8889 5.02224 11.2622 3.34668 8.35556 3.34668C5.44889 3.34668 2.81778 5.02224 1.33334 7.79112L1.20889 8.00001L1.32445 8.21335C2.82223 10.9822 5.44889 12.6578 8.35556 12.6578C11.2622 12.6578 13.8933 11.0045 15.3867 8.21335L15.5022 8.00001L15.3867 7.79112ZM5.45787 8.03252C5.44725 6.34987 6.80181 4.97674 8.48445 4.96446C9.2946 4.95854 10.0738 5.27532 10.65 5.84486C11.2262 6.41439 11.552 7.18985 11.5556 8.00001C11.5629 9.68268 10.2056 11.0531 8.52295 11.0621C6.84029 11.0711 5.4685 9.71517 5.45787 8.03252ZM6.34674 8.0031C6.34104 9.19138 7.29622 10.1611 8.48445 10.1733C9.06311 10.1781 9.61959 9.95094 10.0296 9.54259C10.4396 9.13423 10.6691 8.57869 10.6667 8.00001C10.6593 6.81175 9.69346 5.85261 8.50517 5.85346C7.31688 5.85431 6.35244 6.81483 6.34674 8.0031ZM2.22223 8.00001C3.55556 10.3511 5.85334 11.7467 8.35556 11.7467C10.8533 11.7467 13.1289 10.3511 14.4844 8.00001C13.1289 5.65335 10.8578 4.25335 8.35556 4.25335C5.85334 4.25335 3.55556 5.6489 2.22223 8.00001Z"
        fill="black"
      />
      <mask
        id="mask0_0_2651"
        maskUnits="userSpaceOnUse"
        x="1"
        y="3"
        width="15"
        height="10"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M15.3867 7.79112C13.8889 5.02224 11.2622 3.34668 8.35556 3.34668C5.44889 3.34668 2.81778 5.02224 1.33334 7.79112L1.20889 8.00001L1.32445 8.21335C2.82223 10.9822 5.44889 12.6578 8.35556 12.6578C11.2622 12.6578 13.8933 11.0045 15.3867 8.21335L15.5022 8.00001L15.3867 7.79112ZM5.45787 8.03252C5.44725 6.34987 6.80181 4.97674 8.48445 4.96446C9.2946 4.95854 10.0738 5.27532 10.65 5.84486C11.2262 6.41439 11.552 7.18985 11.5556 8.00001C11.5629 9.68268 10.2056 11.0531 8.52295 11.0621C6.84029 11.0711 5.4685 9.71517 5.45787 8.03252ZM6.34674 8.0031C6.34104 9.19138 7.29622 10.1611 8.48445 10.1733C9.06311 10.1781 9.61959 9.95094 10.0296 9.54259C10.4396 9.13423 10.6691 8.57869 10.6667 8.00001C10.6593 6.81175 9.69346 5.85261 8.50517 5.85346C7.31688 5.85431 6.35244 6.81483 6.34674 8.0031ZM2.22223 8.00001C3.55556 10.3511 5.85334 11.7467 8.35556 11.7467C10.8533 11.7467 13.1289 10.3511 14.4844 8.00001C13.1289 5.65335 10.8578 4.25335 8.35556 4.25335C5.85334 4.25335 3.55556 5.6489 2.22223 8.00001Z"
          fill="white"
        />
      </mask>
      <g mask="url(#mask0_0_2651)">
        <rect width="16" height="16" fill="#489CFF" />
        <rect width="16" height="16" fill="#489CFF" />
      </g>
    </svg>
  );
};
const InfoIcon = () => {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 11C3.2385 11 1 8.761 1 6C1 3.2385 3.2385 1 6 1C8.761 1 11 3.2385 11 6C11 8.761 8.761 11 6 11ZM5.9651 2.25C6.3516 2.25 6.6651 2.5635 6.6651 2.95C6.6651 3.3365 6.3516 3.65 5.9651 3.65C5.5786 3.65 5.2651 3.3365 5.2651 2.95C5.2651 2.5635 5.5786 2.25 5.9651 2.25ZM6 0C2.6865 0 0 2.6865 0 6C0 9.3135 2.6865 12 6 12C9.3135 12 12 9.3135 12 6C12 2.6865 9.3135 0 6 0ZM7.5 8.5H6.5V4.5H5C4.724 4.5 4.5 4.724 4.5 5C4.5 5.276 4.724 5.5 5 5.5H5.5V8.5H4.5C4.224 8.5 4 8.7235 4 9C4 9.2765 4.224 9.5 4.5 9.5H7.5C7.7765 9.5 8 9.2765 8 9C8 8.7235 7.7765 8.5 7.5 8.5Z"
        fill="#489CFF"
      />
    </svg>
  );
};
const inputCva = cva(
  [
    'text-p4a block w-full disabled:cursor-not-allowed',
    'focus:outline-none',
    'pl-1.5 pt-1.5 pb-[5px]',
    'border-b',
    'transition-[background-size] duration-[0.2s] ease-[ease]',
  ],
  {
    variants: {
      color: {
        default: [
          cn(
            // border
            'dark:border-text-text-and-icon border-bg-border-form dark:disabled:border-df-gray-600/50 disabled:border-severity-unknown/50',
            // placeholder styles
            'placeholder:text-severity-unknown/60 disabled:placeholder:text-severity-unknown/50',
            'dark:placeholder:text-df-gray-600 dark:disabled:placeholder:text-df-gray-600/60',
            // text styles
            'text-text-input-value',
            // disabled text color
            'disabled:text-severity-unknown/60 dark:disabled:text-df-gray-600/60',
            // focus style
            'bg-[length:0%_100%] focus:bg-[length:100%_100%]',
            'focus:border-b-accent-accent dark:focus:border-b-accent-accent',
            // bg styles
            'bg-[length:0%_100%] bg-no-repeat',
            'bg-gradient-to-b from-transparent from-95% to-accent-accent to-95%',
            'focus:bg-[length:100%_100%]',
          ),
        ],
        error: [
          cn(
            // border
            'dark:border-chart-red border-status-error dark:disabled:border-df-gray-600/50 disabled:border-severity-unknown/50',
            // placeholder styles
            'placeholder:text-severity-unknown/60 disabled:placeholder:text-severity-unknown/60',
            'dark:placeholder:text-df-gray-600 dark:disabled:placeholder:text-df-gray-600/60',
            // text font
            // text styles
            'dark:text-text-input-value text-text-text-and-icon',
            // disabled text color
            'disabled:text-severity-unknown/60 dark:disabled:text-df-gray-600/60',
            // focus style
            'bg-[length:0%_100%] focus:bg-[length:100%_100%]',
            'dark:focus:border-b-chart-red focus:border-b-status-error',
            // dark and bg styles
            'bg-[length:0%_100%] bg-no-repeat',
            'bg-gradient-to-b from-transparent from-95% dark:to-chart-red-500 to-status-error to-95%',
            'focus:bg-[length:100%_100%]',
          ),
        ],
      },
      sizing: {
        md: '',
      },
      withStartIcon: {
        true: 'pl-[20px]',
      },
      isPasswordType: {
        true: 'placeholder-shown:font-mono',
        false: '',
      },
    },
    defaultVariants: {
      color: 'default',
      sizing: 'md',
      withStartIcon: false,
    },
  },
);

const iconContextCva = cva('', {
  variants: {
    color: {
      default: ['text-text-input-value'],
      error: ['text-text-input-value'],
      success: ['text-text-input-value'],
    },
    sizing: {
      md: `w-4 h-4`,
    },
    disabled: { true: 'dark:text-df-gray-600 text-severity-unknown/60' },
  },
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
      className={cn('pointer-events-none absolute inset-y-0 left-0 flex items-center')}
      data-testid={`textinput-start-icon-${id}`}
    >
      <span
        className={iconContextCva({
          color,
          sizing,
          disabled,
        })}
      >
        {icon}
      </span>
    </span>
  );
};

export interface TextInputProps
  extends Omit<ComponentProps<'input'>, 'ref' | 'color' | 'className' | 'size'>,
    ObjectWithNonNullableValues<Omit<VariantProps<typeof inputCva>, 'withStartIcon'>> {
  startIcon?: React.ReactNode;
  label?: string;
  helperText?: string;
  className?: string;
  required?: boolean;
  info?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      sizing,
      color,
      label,
      disabled,
      startIcon,
      helperText,
      className = '',
      required,
      id,
      info,
      type,
      placeholder,
      ...rest
    },
    ref,
  ) => {
    const isPasswordInput = type === 'password';
    const internalId = useId();
    const _id = id ? id : internalId;
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className={cn('flex flex-col w-full', className)}>
        {label && (
          <div className="flex gap-2 pb-[10px] items-center">
            <LabelPrimitive.Root
              htmlFor={_id}
              className={cn(
                'text-p11 dark:text-text-input-value text-text-text-and-icon',
              )}
            >
              {required && <span>*</span>}
              {label}
            </LabelPrimitive.Root>
            {!!info?.length && (
              <Tooltip content={info} triggerAsChild>
                <button type="button" tabIndex={-1}>
                  <InfoIcon />
                </button>
              </Tooltip>
            )}
          </div>
        )}
        <div className={cn('relative flex items-center')}>
          {startIcon && (
            <LeftIcon
              icon={startIcon}
              sizing={sizing}
              color={color}
              id={_id}
              disabled={disabled}
            />
          )}

          <input
            className={cn(
              inputCva({
                color,
                sizing,
                withStartIcon: !!startIcon,
                isPasswordType: isPasswordInput && !showPassword,
              }),
            )}
            disabled={disabled}
            ref={ref}
            id={_id}
            data-testid={`textinput-${_id}`}
            type={showPassword ? 'text' : type}
            placeholder={isPasswordInput ? PLACEHOLDER_PASSWORD : placeholder}
            {...rest}
            style={{
              backgroundColor: 'transparent',
            }}
          />
          {isPasswordInput && (
            <div className="relative flex items-center">
              <button
                data-testid={`password-icon-${id}`}
                type="button"
                disabled={disabled}
                className="absolute right-0 disabled:cursor-not-allowed"
                onClick={() => {
                  setShowPassword(!showPassword);
                }}
              >
                <PasswordIcon />
              </button>
            </div>
          )}

          {color === 'error' && (
            <div
              className={cn('dark:text-chart-red text-status-error', {
                'cursor-not-allowed': disabled,
              })}
              data-testid={`textinput-error-icon-${id}`}
            >
              <ErrorIcon />
            </div>
          )}
        </div>
        {helperText && (
          <div className="pt-1.5">
            <HelperText color={color} text={helperText} />
          </div>
        )}
      </div>
    );
  },
);

export default TextInput;
