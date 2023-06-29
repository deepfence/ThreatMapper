import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, VariantProps } from 'cva';
import { ChangeEvent, ComponentProps, forwardRef, useId } from 'react';
import { IconContext } from 'react-icons';
import { HiOutlineInformationCircle } from 'react-icons/hi';
import { cn } from 'tailwind-preset';

import HelperText from '@/components/input/HelperText';
import { Tooltip } from '@/main';
import { ObjectWithNonNullableValues } from '@/types/utils';

export type SizeType = 'sm' | 'md' | 'lg';

const inputCva = cva(
  [
    'block w-full rounded-[5px] dark:placeholder-df-gray-400 cursor-auto',
    'border border-gray-300 dark:border-accent-accent',
    'bg-gray-50 dark:bg-transparent',
    'text-gray-900 dark:text-text-text-and-icon dark:hover:border-[#3777C2] file:text-white file:dark:text-black',
    'disabled:cursor-not-allowed',
    'focus:outline-none',
    // ring styles
    'file:border-0 file:cursor-pointer file:hover:bg-gray-700 dark:file:hover:bg-[#3777C2]',
    'file:h-ful file:bg-gray-800 dark:file:bg-accent-accent file:px-3',
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
              className="text-p4 text-gray-900 dark:text-text-input-value"
            >
              {required && <span>*</span>}
              {label}
            </LabelPrimitive.Root>
            {!!hint?.length && (
              <Tooltip content={hint} triggerAsChild>
                <button type="button" tabIndex={-1}>
                  <IconContext.Provider
                    value={{
                      className: 'text-gray-600 dark:text-df-gray-200 h-4 w-4',
                    }}
                  >
                    <HiOutlineInformationCircle />
                  </IconContext.Provider>
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
