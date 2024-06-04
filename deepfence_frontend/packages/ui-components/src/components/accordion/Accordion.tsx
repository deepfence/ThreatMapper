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
      'border border-bg-grid-border',
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
        'w-full overflow-hidden text-text-text-and-icon border-b last:border-b-0', // border bottom on each header trigger except last
        'border-bg-grid-border',
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
        'flex outline-none p-2 place-items-center',
        'w-full group dark:bg-bg-grid-header bg-white',
        'text-p4',
        'data-[state=open]:text-text-input-value',
        'data-[state=closed]:text-text-text-and-icon',
        'disabled:dark:text-opacity-40 disabled:text-opacity-40',
        'disabled:data-[state=closed]:text-opacity-40',
        className,
      )}
      {...props}
      ref={forwardedRef}
    >
      <span
        aria-hidden
        className="shrink-0 group-data-[state=closed]:first:-rotate-90 transition duration-550 ease-out h-4 w-4 inline-block"
      >
        <CaretDown />
      </span>
      <span className="ml-[6px] text-left flex-1">{children}</span>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));

export const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionPrimitive.AccordionContentProps
>(({ children, className, ...props }, forwardedRef) => (
  <AccordionPrimitive.Content
    className={cn(
      'w-full',
      'data-[state=open]:border-t data-[state=open]:border-bg-grid-border', // border top of its content
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
