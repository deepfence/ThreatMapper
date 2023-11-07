import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as LabelPrimitive from '@radix-ui/react-label';
import { isNil } from 'lodash-es';
import React, { useEffect, useId } from 'react';
import { cn } from 'tailwind-preset';

export type CheckboxProps = CheckboxPrimitive.CheckboxProps & {
  label?: React.ReactNode;
};

export const Checkbox: React.FC<CheckboxProps> = (props) => {
  const { className, id, label, checked, onCheckedChange, defaultChecked, ...rest } =
    props;

  const [internalChecked, setInternalChecked] =
    React.useState<CheckboxPrimitive.CheckedState>(
      !isNil(checked) ? checked : !isNil(defaultChecked) ? defaultChecked : false,
    );

  useEffect(() => {
    if (!isNil(checked)) {
      setInternalChecked(checked);
    }
  }, [checked]);

  const internalId = useId();
  const _id = id ? id : internalId;

  return (
    <div className="flex items-center">
      <CheckboxPrimitive.Root
        id={_id}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] peer group',
          'data-[state=unchecked]:bg-gray-50 data-[state=unchecked]:dark:bg-transparent data-[state=unchecked]:border border-gray-300 dark:border-text-text-and-icon',
          'data-[state=checked]:dark:bg-accent-accent',
          // uncheck disabled
          'dark:data-[state=unchecked]:disabled:bg-gray-600 dark:data-[state=unchecked]:disabled:border-none',
          // check disabled
          'dark:data-[state=checked]:disabled:bg-gray-600 dark:data-[state=checked]:disabled:border-none',
          'disabled:cursor-not-allowed',
          {
            'dark:bg-accent-accent': internalChecked === 'indeterminate',
          },
          'transition-colors',
          className,
        )}
        data-testid={`checkbox-${_id}`}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={(state) => {
          if (onCheckedChange) {
            onCheckedChange(state);
            return;
          }
          setInternalChecked(state);
        }}
        {...rest}
      >
        <CheckboxPrimitive.Indicator>
          {internalChecked === 'indeterminate' && (
            <span className="self-center text-white dark:text-black dark:group-disabled:group-data-[state=checked]:bg-gray-900">
              <InterminateIcon />
            </span>
          )}
          {internalChecked === true && (
            <span className="self-center text-white dark:text-black dark:group-disabled:group-data-[state=checked]:bg-gray-900">
              <CheckedIcon />
            </span>
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {!isNil(label) ? (
        <LabelPrimitive.Label
          htmlFor={_id}
          className={cn(
            'pl-1.5 text-p4 dark:text-text-input-value dark:peer-disabled:text-gray-600 peer-disabled:cursor-not-allowed',
          )}
        >
          {label}
        </LabelPrimitive.Label>
      ) : null}
    </div>
  );
};

const CheckedIcon = () => {
  return (
    <svg
      width="11"
      height="8"
      viewBox="0 0 11 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.1995 0.646398C10.6047 1.02171 10.6289 1.65442 10.2536 2.05958L4.80459 7.9419L0.861038 4.48732C0.445609 4.1234 0.403852 3.49161 0.767771 3.07618C1.13169 2.66075 1.76348 2.619 2.17891 2.98291L4.65927 5.15574L8.78636 0.700441C9.16168 0.295278 9.79438 0.271082 10.1995 0.646398Z"
        fill="currentColor"
      />
    </svg>
  );
};

const InterminateIcon = () => {
  return (
    <svg
      width="8"
      height="2"
      viewBox="0 0 8 2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="8" height="2" fill="currentColor" />
    </svg>
  );
};

Checkbox.displayName = 'Checkbox';
