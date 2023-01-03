import * as AccordionPrimitive from '@radix-ui/react-accordion';
import cx from 'classnames';
import React from 'react';
import { HiOutlineChevronDown } from 'react-icons/hi';
import { twMerge } from 'tailwind-merge';

import { Typography } from '@/components/typography/Typography';

export const Accordion = React.forwardRef<
  HTMLDivElement,
  AccordionPrimitive.AccordionSingleProps | AccordionPrimitive.AccordionMultipleProps
>(({ children, className, ...rest }, forwardedRef) => (
  <AccordionPrimitive.Root
    className={twMerge(
      cx(
        'w-full overflow-hidden',
        'rounded-b-lg rounded-t-lg',
        'border border-gray-200 dark:border-gray-700 dark:border-opacity-50', // border of container
        'drop-shadow-[0px_1px_2px_rgba(0,_0,_0,_0.8),_0px_1px_2px_-1px_rgba(0,_0,_0,_0.1)]',
        className,
      ),
    )}
    ref={forwardedRef}
    {...rest}
  >
    {children}
  </AccordionPrimitive.Root>
));

export interface AccordionItemProps extends AccordionPrimitive.AccordionItemProps {
  children: React.ReactNode;
  className?: string;
}

export const AccordionItem = (props: AccordionItemProps) => {
  const { children, value = '', className = '', ...rest } = props;
  return (
    <AccordionPrimitive.Item
      value={value}
      className={twMerge(
        cx(
          'w-full overflow-hidden text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 border-b last:border-b-0', // border bottom on each header trigger except last
          'border-gray-200 dark:border-gray-700 dark:border-opacity-50',
          className,
        ),
      )}
      {...rest}
    >
      {children}
    </AccordionPrimitive.Item>
  );
};

export const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  AccordionPrimitive.AccordionTriggerProps
>(({ children, className, ...props }, forwardedRef) => (
  <AccordionPrimitive.Header>
    <AccordionPrimitive.Trigger
      className={cx(
        'flex outline-none p-5 place-items-center',
        'w-full group',
        `leading-4 ${Typography.size.base} ${Typography.weight.medium}`,
        className,
      )}
      {...props}
      ref={forwardedRef}
    >
      <span className="mr-auto text-left">{children}</span>
      <span>
        <HiOutlineChevronDown
          aria-hidden
          className="group-radix-state-open:first:rotate-180 transition duration-550 ease-out"
        />
      </span>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));

export const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionPrimitive.AccordionContentProps
>(({ children, className, ...props }, forwardedRef) => (
  <AccordionPrimitive.Content
    className={cx(
      'bg-white dark:bg-gray-900 w-full text-gray-500 dark:text-gray-400 leading-6',
      'radix-state-open:border-t dark:radix-state-open:border-gray-700 dark:radix-state-open:border-opacity-50', // border top of its content
      'radix-state-open:animate-accordion-open',
      'radix-state-closed:animate-accordion-closed',
      className,
    )}
    {...props}
    ref={forwardedRef}
  >
    <div>{children}</div>
  </AccordionPrimitive.Content>
));
