import * as AccordionPrimitive from '@radix-ui/react-accordion';
import React from 'react';
import { cn } from 'tailwind-preset';

import { CaretDown } from '@/components/icons/CaretDown';

export const Accordion = React.forwardRef<
  HTMLDivElement,
  AccordionPrimitive.AccordionSingleProps | AccordionPrimitive.AccordionMultipleProps
>(({ children, className, ...rest }, forwardedRef) => (
  <AccordionPrimitive.Root
    className={cn(
      'w-full overflow-hidden',
      'rounded-b-lg rounded-t-lg',
      'border border-gray-200 dark:border-gray-700 dark:border-opacity-50', // border of container
      'drop-shadow-[0px_1px_2px_rgba(0,_0,_0,_0.8),_0px_1px_2px_-1px_rgba(0,_0,_0,_0.1)]',
      className,
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
      className={cn(
        'w-full overflow-hidden text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 border-b last:border-b-0', // border bottom on each header trigger except last
        'border-gray-200 dark:border-gray-700 dark:border-opacity-50',
        className,
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
      className={cn(
        'flex outline-none p-5 place-items-center',
        'w-full group',
        'text-p2',
        'data-[state=open]:text-gray-900',
        'data-[state=closed]:text-gray-500',
        'dark:data-[state=open]:text-white',
        'dark:data-[state=closed]:text-gray-400',
        className,
      )}
      {...props}
      ref={forwardedRef}
    >
      <span
        aria-hidden
        className="group-data-[state=closed]:first:-rotate-90 transition duration-550 ease-out h-4 w-4 inline-block"
      >
        <CaretDown />
      </span>
      <span className="ml-[6px] text-left">{children}</span>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));

export const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionPrimitive.AccordionContentProps
>(({ children, className, ...props }, forwardedRef) => (
  <AccordionPrimitive.Content
    className={cn(
      'bg-white dark:bg-gray-900 w-full text-gray-500 dark:text-gray-400 leading-6',
      'data-[state=open:border-t dark:data-[state=open]:border-gray-700 dark:data-[state=open]:border-opacity-50', // border top of its content
      'data-[state=open]:animate-accordion-open',
      'data-[state=closed]:animate-accordion-closed',
      className,
    )}
    {...props}
    ref={forwardedRef}
  >
    <div>{children}</div>
  </AccordionPrimitive.Content>
));
