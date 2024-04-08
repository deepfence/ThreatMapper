import './DateTimeInput.css';

import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, VariantProps } from 'cva';
import { ComponentProps, forwardRef, useEffect, useId, useState } from 'react';
import { cn } from 'tailwind-preset';

import HelperText from '@/components/input/HelperText';
import { ErrorIcon } from '@/components/input/TextInput';
import { Tooltip } from '@/main';
import { ObjectWithNonNullableValues } from '@/types/utils';

const inputCva = cva(
  [
    'df-datetime-input text-p4 block w-full disabled:cursor-not-allowed',
    'focus:outline-none',
    'pl-1.5 pt-1.5 pb-[5px]',
    'border-b',
    'transition-[background-size] duration-[0.2s] ease-[ease]',
    'dark:[color-scheme:dark]',
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
    },
    defaultVariants: {
      color: 'default',
      sizing: 'md',
    },
  },
);

export interface DateTimeInputProps
  extends ObjectWithNonNullableValues<VariantProps<typeof inputCva>> {
  label?: string;
  helperText?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  id?: string;

  dateInputProps?: ComponentProps<'input'>;
  timeInputProps?: ComponentProps<'input'>;
}

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

export const DateTimeInput = ({
  sizing,
  label,
  helperText,
  hint,
  className = '',
  required,
  id,
  color,
  dateInputProps,
  timeInputProps,
}: DateTimeInputProps) => {
  const internalId = useId();
  const _id = id ? id : internalId;

  return (
    <div className={cn('flex flex-col gap-2 w-full', className)}>
      {label && (
        <div className="flex gap-2 items-center">
          <LabelPrimitive.Root
            htmlFor={_id}
            className={cn('text-p11 dark:text-text-input-value text-text-text-and-icon')}
          >
            {required && <span>*</span>}
            {label}
          </LabelPrimitive.Root>
          {!!hint?.length && (
            <Tooltip content={hint} triggerAsChild>
              <button type="button" tabIndex={-1}>
                <InfoIcon />
              </button>
            </Tooltip>
          )}
        </div>
      )}

      <div className="flex items-center w-full">
        <div className="flex items-center gap-2 flex-1">
          <DateInput
            {...dateInputProps}
            ref={dateInputProps?.ref as any}
            id={_id}
            color={color}
            sizing={sizing}
          />
          <TimeInput
            {...timeInputProps}
            ref={timeInputProps?.ref as any}
            id={_id}
            color={color}
            sizing={sizing}
          />
        </div>

        {color === 'error' && (
          <div
            className={cn('dark:text-chart-red text-status-error', {
              'cursor-not-allowed': dateInputProps?.disabled || timeInputProps?.disabled,
            })}
            data-testid={`textinput-error-icon-${_id}`}
          >
            <ErrorIcon />
          </div>
        )}
      </div>
      {helperText && <HelperText text={helperText} color={color} className="mb-2.5" />}
    </div>
  );
};

const DateInput = forwardRef<
  HTMLInputElement,
  ComponentProps<'input'> & {
    id: string;
    color?: 'default' | 'error';
    sizing?: 'md';
  }
>((props, ref) => {
  const { value, defaultValue, onChange, id, sizing, color, ...rest } = props;

  const [internalValue, setInternalValue] = useState<(typeof props)['value']>(
    value ?? defaultValue ?? '',
  );

  return (
    <input
      {...rest}
      ref={ref}
      data-testid={`dateinput-${id}`}
      type="date"
      id={id}
      value={internalValue}
      onChange={(e) => {
        setInternalValue(e.target.value);
        if (onChange) onChange(e);
      }}
      pattern="\d{4}-\d{2}-\d{2}"
      className={cn(
        inputCva({
          sizing,
          color,
        }),
        {
          'df-datetime-input--has-value':
            typeof internalValue === 'string' && internalValue.length,
        },
      )}
    />
  );
});

const TimeInput = forwardRef<
  HTMLInputElement,
  ComponentProps<'input'> & {
    id: string;
    color?: 'default' | 'error';
    sizing?: 'md';
  }
>((props, ref) => {
  const { value, defaultValue, onChange, id, sizing, color, ...rest } = props;

  const [internalValue, setInternalValue] = useState<(typeof props)['value']>(
    value ?? defaultValue ?? '',
  );

  return (
    <input
      {...rest}
      ref={ref}
      data-testid={`timeinput-${id}`}
      type="time"
      id={id ? `time-${id}` : undefined}
      className={cn(
        inputCva({
          sizing,
          color,
        }),
        {
          'df-datetime-input--has-value':
            typeof internalValue === 'string' && internalValue.length,
        },
      )}
      pattern="[0-9]{2}:[0-9]{2}"
      value={internalValue}
      onChange={(e) => {
        setInternalValue(e.target.value);
        if (onChange) onChange(e);
      }}
    />
  );
});

export default DateTimeInput;
