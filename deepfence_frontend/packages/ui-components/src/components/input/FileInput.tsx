import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, VariantProps } from 'cva';
import { ChangeEvent, ComponentProps, forwardRef, useId } from 'react';
import { cn } from 'tailwind-preset';

import HelperText from '@/components/input/HelperText';
import { Tooltip } from '@/main';
import { ObjectWithNonNullableValues } from '@/types/utils';

export type SizeType = 'sm' | 'md' | 'lg';

const inputCva = cva(
  [
    'block w-full rounded-[5px] dark:placeholder-df-gray-400 placeholder-df-gray-500 cursor-auto',
    'border border-accent-accent',
    'bg-gray-50 dark:bg-transparent',
    'dark:text-text-input-value text-text-text-and-icon hover:border-[#1466B8] dark:hover:border-bg-hover-1 file:text-text-text-inverse',
    'disabled:cursor-not-allowed',
    'focus:outline-none',
    // ring styles
    'file:border-0 file:cursor-pointer dark:file:hover:bg-bg-hover-1 file:hover:bg-[#1466B8]',
    'file:h-ful file:bg-btn-blue file:px-3',
  ],
  {
    variants: {
      sizing: {
        sm: 'text-t3 file:py-1 file:mr-3',
        md: 'text-t3 file:py-[7px] file:mr-3',
        lg: 'text-t3 file:py-2.5 file:mr-3',
      },
    },

    defaultVariants: {
      sizing: 'md',
    },
  },
);

export interface TextInputProps
  extends Omit<ComponentProps<'input'>, 'ref' | 'color' | 'size'>,
    ObjectWithNonNullableValues<VariantProps<typeof inputCva>> {
  label?: string;
  helperText?: string;
  required?: boolean;
  accept?: string;
  hint?: string;
  onChoosen?: (e: ChangeEvent<HTMLInputElement>) => void;
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

export const FileInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    { sizing, label, helperText, hint, className = '', required, id, onChoosen, ...rest },
    ref,
  ) => {
    const internalId = useId();
    const _id = id ? id : internalId;

    return (
      <div className={cn('flex flex-col gap-2 w-full', className)}>
        {label && (
          <div className="flex gap-2 items-center">
            <LabelPrimitive.Root
              htmlFor={_id}
              className="text-p11 dark:text-text-input-value text-text-text-and-icon"
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

        <input
          {...rest}
          ref={ref}
          data-testid={`fileinput-${id}`}
          type="file"
          className={cn(
            inputCva({
              sizing,
            }),
          )}
          onChange={onChoosen}
        />
        {helperText && <HelperText text={helperText} className="mb-2.5" />}
      </div>
    );
  },
);

export default FileInput;
