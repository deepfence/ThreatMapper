import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, VariantProps } from 'cva';
import { ChangeEvent, ComponentProps, forwardRef, useId, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

import HelperText from '@/components/input/HelperText';
import { ObjectWithNonNullableValues } from '@/types/utils';

export type SizeType = 'sm' | 'md' | 'lg';

const inputCva = cva(
  [
    'inline-flex flex-1 cursor-pointer focus:outline-none',
    'text-gray-900 dark:text-gray-400 dark:placeholder-gray-400',
    'border border-gray-300 dark:border-gray-600 rounded-r-lg',
    'bg-gray-50 dark:bg-gray-700',
    'disabled:cursor-not-allowed',
  ],
  {
    variants: {
      sizing: {
        sm: `text-sm px-4 py-2`,
        md: `text-sm px-4 py-3`,
        lg: `text-base px-4 py-3.5`,
      },
    },

    defaultVariants: {
      sizing: 'md',
    },
  },
);

const buttonCva = cva(
  [
    'cursor-pointer inline-flex self-start items-center bg-gray-800 text-white dark:text-white',
    'border border-r-0 border-gray-300 dark:border-gray-600 outline-none rounded-l-md px-4',
    'dark:bg-gray-600',
  ],
  {
    variants: {
      sizing: {
        sm: `text-sm px-4 py-2`,
        md: `text-sm px-4 py-3`,
        lg: `text-base px-4 py-3.5`,
      },
    },

    defaultVariants: {
      sizing: 'md',
    },
  },
);

export interface TextInputProps
  extends Omit<ComponentProps<'input'>, 'ref' | 'color' | 'className' | 'size'>,
    ObjectWithNonNullableValues<VariantProps<typeof inputCva>> {
  label?: string;
  fileName?: string;
  helperText?: string;
  className?: string;
  required?: boolean;
  onChoosen?: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const FileInput = forwardRef<HTMLButtonElement, TextInputProps>(
  (
    {
      sizing,
      label,
      disabled,
      helperText,
      fileName,
      className = '',
      required,
      id,
      onChoosen,
      ...rest
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const internalId = useId();
    const _id = id ? id : internalId;

    const onFileChange = () => {
      if (inputRef.current) {
        inputRef.current.click();
      }
    };
    return (
      <div className={twMerge('flex flex-col gap-2 w-full', className)}>
        {label && (
          <LabelPrimitive.Root
            htmlFor={_id}
            className="text-sm font-medium text-gray-900 dark:text-white"
          >
            {required && <span>*</span>}
            {label}
          </LabelPrimitive.Root>
        )}
        <div className="relative flex">
          <button
            className={twMerge(
              buttonCva({
                sizing,
              }),
            )}
            data-testid={`btn-fileinput-${id}`}
            disabled={disabled}
            ref={ref}
            onClick={onFileChange}
          >
            Choose file
          </button>
          <input
            className={twMerge(
              inputCva({
                sizing,
              }),
            )}
            value={fileName ?? ''}
            readOnly
            data-testid={`fileinput-${id}`}
            disabled={disabled}
            onClick={onFileChange}
            {...rest}
          />
          <input
            ref={inputRef}
            onChange={onChoosen}
            type="file"
            className="absolute w-0 h-0 opacity-0 pin-r pin-t left-0 top-0 cursor-pointer"
            accept="*"
            data-testid={`textinput-${_id}`}
            {...rest}
          />
        </div>
        {helperText && <HelperText text={helperText} className="mb-2.5" />}
      </div>
    );
  },
);

export default FileInput;
