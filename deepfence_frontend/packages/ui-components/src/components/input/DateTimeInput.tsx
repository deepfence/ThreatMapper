import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, VariantProps } from 'cva';
import { ComponentProps, useId } from 'react';
import { cn } from 'tailwind-preset';

import HelperText from '@/components/input/HelperText';
import { ErrorIcon } from '@/components/input/TextInput';
import { Tooltip } from '@/main';
import { ObjectWithNonNullableValues } from '@/types/utils';

const inputCva = cva(
  [
    'text-p4 df-input block w-full disabled:cursor-not-allowed',
    'focus:outline-none',
    'pl-1.5 pt-1.5 pb-[5px]',
    'border-b',
    'bg-transparent',
    'transition-[background-size] duration-[0.2s] ease-[ease]',
    'dark:[color-scheme:dark]',
  ],
  {
    variants: {
      color: {
        default: [
          cn(
            // border
            'dark:border-text-text-and-icon',
            // placeholder styles
            'placeholder-df-gray-500 disabled:placeholder-df-gray-600',
            'dark:placeholder-df-gray-600 dark:disabled:placeholder-df-gray-600',
            // text styles
            'text-gray-900 dark:text-text-input-value',
            // disabled text color
            'disabled:text-gray-700 dark:disabled:text-df-gray-600',
            // focus style
            'dark:bg-[length:0%_100%] dark:focus:bg-[length:100%_100%]',
            'dark:focus:border-b-accent-accent',
            // dark and bg styles
            'dark:bg-no-repeat',
            'dark:focus:bg-no-repeat',
            // 'dark:focus:bg-[linear-gradient(to_bottom,_transparent_95%,_#489CFF_95%)]',
            // 'dark:bg-[linear-gradient(to_bottom,_transparent_95%,_#489CFF_95%)]',
          ),
        ],
        error: [
          cn(
            // border
            'dark:border-chart-red df-error',
            // placeholder styles
            'placeholder-df-gray-500 disabled:placeholder-df-gray-600',
            'dark:placeholder-df-gray-400 dark:disabled:placeholder-df-gray-500',
            // text font
            // text styles
            'text-gray-900 dark:text-text-input-value',
            // disabled text color
            'disabled:text-gray-700 dark:disabled:text-df-gray-600',
            // focus style
            'dark:bg-[length:0%_100%] dark:focus:bg-[length:100%_100%]',
            'dark:focus:border-b-chart-red',
            // dark and bg styles
            'dark:bg-no-repeat',
            'dark:focus:bg-no-repeat',
            // 'dark:focus:bg-[linear-gradient(to_bottom,_transparent_95%,_#F55B47_95%)]',
            // 'dark:bg-[linear-gradient(to_bottom,_transparent_95%,_#F55B47_95%)]',
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
            className={cn('text-p3 text-gray-900 dark:text-text-text-and-icon', {
              'dark:text-df-gray-600':
                dateInputProps?.disabled || timeInputProps?.disabled,
            })}
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
          <input
            {...dateInputProps}
            data-testid={`dateinput-${id}`}
            type="date"
            id={_id}
            pattern="\d{4}-\d{2}-\d{2}"
            className={cn(
              inputCva({
                sizing,
                color,
              }),
            )}
          />
          <input
            {...timeInputProps}
            data-testid={`timeinput-${id}`}
            type="time"
            id={`time-${_id}`}
            className={cn(
              inputCva({
                sizing,
                color,
              }),
            )}
            pattern="[0-9]{2}:[0-9]{2}"
          />
        </div>

        {color === 'error' && (
          <div
            className={cn('text-chart-red', {
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

export default DateTimeInput;
